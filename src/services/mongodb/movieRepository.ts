import type { FilterQuery } from "mongoose";

import Movie, { MovieDocument } from "@/models/Movie";
import type { Movie as MovieType } from "@/types";

import { mapMovieObject, type RawMovieObject } from "./mapMovie";
import { connectToDatabase } from "./mongodbService";

/** Parameters accepted by {@link listMovies}. */
export interface ListMoviesParams {
  genre?: string;
  year?: number;
  premium?: boolean;
  page?: number;
  limit?: number;
}

/** Result shape returned by {@link listMovies}. */
export interface ListMoviesResult {
  movies: MovieType[];
  total: number;
}

/** Fields a caller may provide when creating a movie. */
export type CreateMovieInput = Omit<
  MovieType,
  "id" | "createdAt" | "updatedAt" | "views" | "downloadCount"
> & {
  views?: number;
  downloadCount?: number;
};

/** Fields a caller may update on an existing movie. */
export type UpdateMovieInput = Partial<CreateMovieInput>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Map a Mongoose Movie document to the shared `Movie` type, converting `_id`
 * to a string `id` and serialising the timestamp fields to ISO strings.
 */
function mapMovie(doc: MovieDocument): MovieType {
  const obj = doc.toObject ? doc.toObject() : (doc as any);
  return mapMovieObject(obj as RawMovieObject);
}

/**
 * List movies with optional filtering and pagination.
 * Returns the matching page of movies plus the total count of matches.
 */
export async function listMovies(
  params: ListMoviesParams = {},
): Promise<ListMoviesResult> {
  await connectToDatabase();

  const { genre, year, premium, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } =
    params;

  const filter: FilterQuery<MovieDocument> = {};
  if (genre) {
    // Case-insensitive substring match on genre so the API path agrees with
    // the offline MovieContext fallback and getMoviesByCategory (both use
    // substring `.includes()`). Escaping the input keeps it safe as a RegExp.
    filter.genre = new RegExp(escapeRegExp(genre), "i");
  }
  if (typeof year === "number") filter.year = year;
  if (typeof premium === "boolean") filter.premium = premium;

  const safePage = page > 0 ? page : DEFAULT_PAGE;
  const safeLimit = limit > 0 ? limit : DEFAULT_LIMIT;
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    Movie.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Movie.countDocuments(filter),
  ]);

  return { movies: docs.map(mapMovie), total };
}

/** Fetch a single movie by its id, or `null` when not found. */
export async function getMovieById(id: string): Promise<MovieType | null> {
  await connectToDatabase();

  const doc = await Movie.findById(id);
  return doc ? mapMovie(doc) : null;
}

/**
 * Full-text-ish search across title, description, genre, director and cast.
 * Uses a case-insensitive regex so it works without a text index.
 */
export async function searchMovies(query: string): Promise<MovieType[]> {
  await connectToDatabase();

  const trimmed = (query || "").trim();
  if (!trimmed) {
    return [];
  }

  const regex = new RegExp(escapeRegExp(trimmed), "i");
  const docs = await Movie.find({
    $or: [
      { title: regex },
      { description: regex },
      { genre: regex },
      { director: regex },
      { cast: regex },
    ],
  }).sort({ createdAt: -1 });

  return docs.map(mapMovie);
}

/** Create a new movie document and return it in the shared `Movie` shape. */
export async function createMovie(
  data: CreateMovieInput,
): Promise<MovieType> {
  await connectToDatabase();

  const doc = await Movie.create(data);
  return mapMovie(doc);
}

/** Update a movie by id, returning the updated document or `null` if missing. */
export async function updateMovie(
  id: string,
  data: UpdateMovieInput,
): Promise<MovieType | null> {
  await connectToDatabase();

  const doc = await Movie.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  return doc ? mapMovie(doc) : null;
}

/** Delete a movie by id. Resolves `true` when a document was removed. */
export async function deleteMovie(id: string): Promise<boolean> {
  await connectToDatabase();

  const doc = await Movie.findByIdAndDelete(id);
  return doc !== null;
}

/**
 * Atomically increment a movie's view counter, returning the updated movie or
 * `null` when no movie matches the given id.
 */
export async function incrementViews(id: string): Promise<MovieType | null> {
  await connectToDatabase();

  const doc = await Movie.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true },
  );
  return doc ? mapMovie(doc) : null;
}

/** Escape user input so it can be embedded safely in a RegExp. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
