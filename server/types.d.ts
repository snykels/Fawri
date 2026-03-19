declare module 'duckduckgo-images-api' {
    interface ImageResult {
        title: string;
        image: string;
        thumbnail: string;
        url: string;
        height: number;
        width: number;
        source: string;
    }

    interface SearchOptions {
        query: string;
        moderate?: boolean;
        iterations?: number;
        retries?: number;
    }

    export function image_search(options: SearchOptions): Promise<ImageResult[]>;
}
