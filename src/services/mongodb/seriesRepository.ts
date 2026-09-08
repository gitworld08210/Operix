import type { FilterQuery } from "mongoose";

import Series, { SeriesDocument } from "@/models/Series";
import type { Series as SeriesType, Season, Episode } from "@/types";

import { mapSeriesObject, type RawSeriesObject } from "./mapSeries";
import { connectToDatabase } from "./mongodbService";

/** Parameters accepted by {@link listSeries}. */
export interface ListSeriesParams {
  genre?: string;
  year?: number;
  premium?: boolean;
  page?: number;
  limit?: number;
}

/** Result shape returned by {@link listSeries}. */
export interface ListSeriesResult {
  series: SeriesType[];
  total: number;
}

/** Fields a caller may provide when creating a series. */
export type CreateSeriesInput = Omit<
  SeriesType,
  "id" | "createdAt" | "updatedAt" | "views"
> & {
  views?: number;
};

/** Fields a caller may update on an existing series. */
export type UpdateSeriesInput = Partial<CreateSeriesInput>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Map a Mongoose Series document to the shared `Series` type, converting `_id`
 * to a string `id` and serialising the timestamp fields to ISO strings. Pure
 * mapping is delegated to {@link mapSeriesObject}.
 */
function mapSeries(doc: SeriesDocument): SeriesType {
  const obj = doc.toObject ? doc.toObject() : (doc as any);
  return mapSeriesObject(obj as RawSeriesObject);
}

/**
 * List series with optional filtering and pagination. Returns the matching
 * page of series plus the total count of matches. Mirrors the movie repository
 * so the two catalogs behave identically (case-insensitive substring genre).
 */
export async function listSeries(
  params: ListSeriesParams = {},
): Promise<ListSeriesResult> {
  await connectToDatabase();

  const { genre, year, premium, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } =
    params;

  const filter: FilterQuery<SeriesDocument> = {};
  if (genre) {
    filter.genre = new RegExp(escapeRegExp(genre), "i");
  }
  if (typeof year === "number") filter.year = year;
  if (typeof premium === "boolean") filter.premium = premium;

  const safePage = page > 0 ? page : DEFAULT_PAGE;
  const safeLimit = limit > 0 ? limit : DEFAULT_LIMIT;
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    Series.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Series.countDocuments(filter),
  ]);

  return { series: docs.map(mapSeries), total };
}

/** Fetch a single series by its id, or `null` when not found. */
export async function getSeriesById(id: string): Promise<SeriesType | null> {
  await connectToDatabase();

  const doc = await Series.findById(id);
  return doc ? mapSeries(doc) : null;
}

/**
 * Search series by a free-text query across title, description, genre,
 * director and cast. Uses a case-insensitive regex so it works without a text
 * index (mirrors the movie search behaviour).
 */
export async function searchSeries(query: string): Promise<SeriesType[]> {
  await connectToDatabase();

  const trimmed = (query || "").trim();
  if (!trimmed) {
    return [];
  }

  const regex = new RegExp(escapeRegExp(trimmed), "i");
  const docs = await Series.find({
    $or: [
      { title: regex },
      { description: regex },
      { genre: regex },
      { director: regex },
      { cast: regex },
    ],
  }).sort({ createdAt: -1 });

  return docs.map(mapSeries);
}

/** Create a new series document and return it in the shared `Series` shape. */
export async function createSeries(
  data: CreateSeriesInput,
): Promise<SeriesType> {
  await connectToDatabase();

  const doc = await Series.create(data);
  return mapSeries(doc);
}

/** Update a series by id, returning the updated document or `null` if missing. */
export async function updateSeries(
  id: string,
  data: UpdateSeriesInput,
): Promise<SeriesType | null> {
  await connectToDatabase();

  const doc = await Series.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  return doc ? mapSeries(doc) : null;
}

/** Delete a series by id. Resolves `true` when a document was removed. */
export async function deleteSeries(id: string): Promise<boolean> {
  await connectToDatabase();

  const doc = await Series.findByIdAndDelete(id);
  return doc !== null;
}

/**
 * Atomically increment a series' view counter, returning the updated series or
 * `null` when no series matches the given id.
 */
export async function incrementSeriesViews(
  id: string,
): Promise<SeriesType | null> {
  await connectToDatabase();

  const doc = await Series.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true },
  );
  return doc ? mapSeries(doc) : null;
}

/**
 * Add (or replace) an episode within a series' season. If the season does not
 * yet exist it is created; if an episode with the same `episodeNumber` already
 * exists in that season it is overwritten (idempotent upload). Returns the
 * updated series, or `null` when no series matches the id.
 *
 * This uses a read-modify-write on the embedded array rather than positional
 * `$` operators so the "create season if missing" and "replace episode by
 * number" semantics stay explicit and testable.
 */
export async function addEpisodeToSeries(
  seriesId: string,
  seasonNumber: number,
  episode: Episode,
  seasonTitle?: string,
): Promise<SeriesType | null> {
  await connectToDatabase();

  const doc = await Series.findById(seriesId);
  if (!doc) {
    return null;
  }

  const seasons = doc.seasons as unknown as Season[];
  let season = seasons.find((s) => s.seasonNumber === seasonNumber);
  if (!season) {
    season = { seasonNumber, title: seasonTitle, episodes: [] };
    seasons.push(season);
  } else if (seasonTitle && !season.title) {
    season.title = seasonTitle;
  }

  const existingIndex = season.episodes.findIndex(
    (e) => e.episodeNumber === episode.episodeNumber,
  );
  if (existingIndex >= 0) {
    season.episodes[existingIndex] = episode;
  } else {
    season.episodes.push(episode);
  }

  doc.markModified("seasons");
  await doc.save();
  return mapSeries(doc);
}

/** Escape user input so it can be embedded safely in a RegExp. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
