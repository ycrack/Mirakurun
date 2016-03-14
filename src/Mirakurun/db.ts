/*
   Copyright 2016 Yuki KAN

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/// <reference path="../../typings/node/node.d.ts" />
'use strict';

import fs = require('fs');
import log = require('./log');

module db {

    export interface Service {
        id: number;
        name: string;
        channel: Channel;
    }

    export interface Channel {
        type: string;
        channel: string;
    }

    export interface Program {
        id: number;
        eventId: number;
        serviceId: number;
        startAt: number;
        endAt: number;
        length: number;
        name: string;
        description: string;
        genre: string;
        attributes: string[];
        video: ProgramVideo;
        audio: ProgramAudio;
        series?: ProgramSeries;
    }

    export interface ProgramVideo {
        type: string;
        resolution: string;
        streamContent: number;
        componentType: number;
    }

    export interface ProgramAudio {
        type: string;
        qualityIndicator: number;
        samplingRate: number;
        componentType: number;
    }

    export interface ProgramSeries {
        id: number;
        repeatCount: number;
        pattern: number;
        expiresAt: number;
        lastEpisode: number;
        name: string;
    }

    export function loadServices(): Service[] {
        return load(process.env.SERVICES_DB_PATH);
    }

    export function saveServices(data: Service[]): Promise<void> {
        return save(process.env.SERVICES_DB_PATH, data);
    }

    export function loadPrograms(): Program[] {
        return load(process.env.PROGRAMS_DB_PATH);
    }

    export function savePrograms(data: Program[]): Promise<void> {
        return save(process.env.PROGRAMS_DB_PATH, data);
    }

    function load(path) {

        log.debug('load db `%s`', path);

        if (fs.existsSync(path) === true) {
            return require(path);
        } else {
            return [];
        }
    }

    function save(path: string, data: any[]): Promise<void> {

        log.debug('save db `%s`', path);

        return new Promise<void>((resolve, reject) => {

            fs.writeFile(path, JSON.stringify(data), err => {

                if (err) {
                    return reject(err);
                }

                delete require.cache[require.resolve(path)];

                resolve();
            });
        });
    }
}

export = db;