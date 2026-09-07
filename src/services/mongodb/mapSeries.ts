import type { Series as SeriesType, Season, Episode } from "@/types";

/**
 * Plain-object views of a persisted series and its embedded subdocuments, i.e.
 * the result of calling `.toObject()` on a Mongoose Series document (or an
 * equivalent lean object). Kept dependency-free (no mongoose import) so the
 * pure mapping below can be unit-tested offline without the uninstallable
 * driver.
 */
export interface RawEpisodeObject {
  episodeNumber: number;
  title: string;
  description?: string;
  videoUrl: string;
  blobName?: string;
  thumbnail?: string;
  duration?: string;
}

export interface RawSeasonObject {
  seasonNumber: number;
  title?: string;
  episodes?: RawEpisodeObject[];
}

export interface RawSeriesObject {
  _id: unknown;
  title: string;
  description: string;
  poster: string;
  background: string;
  thumbnail?: string;
  rating: number;
  year: number;
  genre: string;
  genres?: string[];
  cast?: string[];
  director: string;
  premium: boolean;
  views: number;
  seasons?: RawSeasonObject[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Map a raw embedded episode to the shared `Episode` type (pure). */
function mapEpisode(ep: RawEpisodeObject): Episode {
  return {
    episodeNumber: ep.episodeNumber,
    title: ep.title,
    description: ep.description,
    videoUrl: ep.videoUrl,
    blobName: ep.blobName,
    thumbnail: ep.thumbnail,
    duration: ep.duration,
  };
}

/**
 * Map a raw embedded season to the shared `Season` type (pure). Episodes are
 * sorted by `episodeNumber` so callers get a stable, viewer-friendly order
 * regardless of insertion order.
 */
function mapSeason(season: RawSeasonObject): Season {
  const episodes = (season.episodes ?? [])
    .map(mapEpisode)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
  return {
    seasonNumber: season.seasonNumber,
    title: season.title,
    episodes,
  };
}

/**
 * Pure mapping from a persisted series object to the shared `Series` type:
 * converts `_id` to a string `id`, defaults a missing `cast`/`seasons` to `[]`,
 * sorts seasons (and their episodes) by number, and serialises Date timestamps
 * to ISO strings (passing through string values).
 *
 * This is intentionally free of any mongoose dependency so it can be exercised
 * by offline unit tests (see mapSeries.test.ts). The repository's document
 * mapper delegates here after calling `.toObject()`.
 */
export function mapSeriesObject(obj: RawSeriesObject): SeriesType {
  const seasons = (obj.seasons ?? [])
    .map(mapSeason)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    id: String(obj._id),
    title: obj.title,
    description: obj.description,
    poster: obj.poster,
    background: obj.background,
    thumbnail: obj.thumbnail,
    rating: obj.rating,
    year: obj.year,
    genre: obj.genre,
    genres: obj.genres,
    cast: obj.cast ?? [],
    director: obj.director,
    premium: obj.premium,
    views: obj.views,
    seasons,
    createdAt:
      obj.createdAt instanceof Date
        ? obj.createdAt.toISOString()
        : obj.createdAt,
    updatedAt:
      obj.updatedAt instanceof Date
        ? obj.updatedAt.toISOString()
        : obj.updatedAt,
  };
}
