declare module "tail" {
    import { EventEmitter } from "node:events";
    import type { StatsListener, WatchFileOptions, WatchListener, WatchOptions } from "node:fs";

    export type TailOptions = {
        separator?: string | RegExp | null;
        follow?: boolean;
        logger?: DevNull;
        flushAtEOF?: boolean;
        encoding?: BufferEncoding;
        fromBeginning?: boolean;
        nLines?: number;
    } & (
            { useWatchFile: true; fsWatchOptions?: WatchFileOptions; } |
            { useWatchFile?: false; fsWatchOptions?: WatchOptions; }
        );

    interface DevNull {
        info(...args: any);
        error(...args: any);
    }

    export class Tail extends EventEmitter<{
        error: [string | Error];
        line: [string | Error];
    }> {
        constructor(filename: string, options?: TailOptions);

        getIndexOfLastLine(text: string): number | null;
        getPositionAtNthLine(nLines: number): number;
        latestPosition(): number;
        readBlock(): void;
        change(): void;
        watch(startingCursor: number, flush?: boolean): void;
        rename(filename: string): void;
        watchEvent: WatchListener<string>;
        watchFileEvent: StatsListener;
        unwatch(): void;
    }
}
