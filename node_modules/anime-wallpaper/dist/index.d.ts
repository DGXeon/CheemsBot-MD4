import { AnimeWall1, AnimeWall2, AnimeWall3, searchOpt, searchOpt2 } from "./typings";
export declare class AnimeWallpaper {
    constructor();
    /**
     * Scraping images wallpaper from AlphaCoders
     *
     * @param {Object}
     * @param {string} title.search the title of anime you want to search.
     * @param {string|number} title.page the page for image you want to search.
     * @returns {AnimeWall1}
     */
    getAnimeWall1(title: searchOpt): Promise<AnimeWall1[]>;
    /**
     * Scraping images wallpaper from WallpaperCave
     *
     * @param title the title of anime that you want to search.
     * @returns {AnimeWall2}
     */
    getAnimeWall2(title: string): Promise<AnimeWall2[]>;
    /**
     * Scraping images wallpaper from free4kWallpaper
     *
     * this function will be return random anime wallpaper
     *
     * @returns {AnimeWall2}
     */
    getAnimeWall3(): Promise<AnimeWall2[]>;
    /**
     * Scraping images wallpaper from WallHaven
     *
     * @param search.title the title of the anime you want to search.
     * @param search.type the type or purity of image sfw or sketchy image or even both.
     * @param search.page the page for image you want to search, default is 1
     * @returns {AnimeWall3}
     */
    getAnimeWall4(search: searchOpt2): Promise<AnimeWall3[]>;
    private _request;
    private delay;
}
