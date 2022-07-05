export interface AnimeWall1 {
    title: string;
    thumbnail: string;
    image: string;
}
export interface AnimeWall2 {
    title: string;
    image: string;
}
export interface AnimeWall3 {
    image: string;
}
export interface searchOpt {
    search: string;
    page: string | number;
}
export interface searchOpt2 {
    title: string;
    page: string;
    type: "sfw" | "sketchy" | "both";
}
