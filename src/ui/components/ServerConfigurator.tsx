/*
   Copyright 2020 kanreisa

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
import type { EventEmitter } from "eventemitter3";
import React, { useState, useEffect, useRef } from "react";
import {
    Stack,
    Separator,
    Spinner,
    SpinnerSize,
    Dropdown,
    TooltipHost,
    Icon,
    Label,
    TextField,
    PrimaryButton,
    DefaultButton,
    Toggle,
    Dialog,
    DialogType,
    DialogFooter,
} from "@fluentui/react";
import { Validator as IPValidator } from "ip-num/Validator"
import type { UIState } from "../index";
import type { ConfigServer } from "../../../api";

const configAPI = "/api/config/server";

const Configurator: React.FC<{ uiState: UIState, uiStateEvents: EventEmitter }> = ({ uiState, uiStateEvents }) => {

    const [current, setCurrent] = useState<ConfigServer>(null);
    const [editing, setEditing] = useState<ConfigServer>(null);
    const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
    const [saved, setSaved] = useState<boolean>(false);

    useEffect(() => {
        if (saved === true) {
            setTimeout(() => {
                uiStateEvents.emit("notify:restart-required");
            }, 500);
            setSaved(false);
            return;
        }
        (async () => {
            try {
                const res = await (await fetch(configAPI)).json();
                console.log("ServerConfigurator", "GET", configAPI, "->", res);
                setEditing({ ...res });
                setCurrent({ ...res });
            } catch (e) {
                console.error(e);
            }
        })();
    }, [saved]);

    const docker = uiState.status.process.env.DOCKER === "YES";
    const ipv6Ready = docker === false || uiState.status.process.env.DOCKER_NETWORK === "host";
    const changed = JSON.stringify(current) !== JSON.stringify(editing);

    let invalid = false;
    if (editing) {
        if (editing.allowIPv4CidrRanges) {
            for (const range of editing.allowIPv4CidrRanges) {
                const [valid] = IPValidator.isValidIPv4CidrRange(range);
                if (!valid) {
                    invalid = true;
                    break;
                }
            }
        }
        if (!invalid && editing.allowIPv6CidrRanges) {
            for (const range of editing.allowIPv6CidrRanges) {
                const [valid] = IPValidator.isValidIPv6CidrRange(range);
                if (!valid) {
                    invalid = true;
                    break;
                }
            }
        }
    }

    return (
        <>
            {!current && <Spinner size={SpinnerSize.large} />}
            {editing &&
                <Stack tokens={{ childrenGap: "8 0" }}>
                    <Dropdown
                        label="LogLevel"
                        styles={{ dropdown: { display: "inline-block" } }}
                        disabled={docker && typeof uiState.status.process.env.LOG_LEVEL === "string"}
                        onRenderLabel={(props) => (
                            <Stack horizontal verticalAlign="end">
                                <Label>{props.label}</Label>
                                <TooltipHost content="If running in Docker, Env var `LOG_LEVEL` is preferred.">
                                    <Icon
                                        iconName="Info"
                                        style={{ marginLeft: 4, marginBottom: 6 }}
                                    />
                                </TooltipHost>
                            </Stack>
                        )}
                        options={[
                            { key: -1, text: "FATAL (-1)" },
                            { key: 0, text: "ERROR (0)" },
                            { key: 1, text: "WARN (1)" },
                            { key: 2, text: "INFO (2)" }, // default
                            { key: 3, text: "DEBUG (3)" },
                        ]}
                        selectedKey={editing?.logLevel === undefined ? 2 : editing?.logLevel}
                        onChange={(ev, option: any) => {
                            setEditing({ ...editing, logLevel: option.key });
                        }}
                    />

                    <TextField
                        styles={{ fieldGroup: { "max-width": 200 } }}
                        label="Hostname"
                        value={editing.hostname}
                        onChange={(ev, newValue) => {
                            setEditing({ ...editing, hostname: newValue });
                        }}
                    />

                    <Toggle
                        label="IPv6"
                        disabled={!ipv6Ready}
                        checked={(ipv6Ready && (editing.disableIPv6 === undefined || editing.disableIPv6 === false))}
                        onText="Enable"
                        offText="Disable"
                        onChange={(ev, checked) => {
                            setEditing({ ...editing, disableIPv6: checked === false });
                        }}
                    />

                    <Separator alignContent="start">Advanced</Separator>

                    <TextField
                        styles={{ fieldGroup: { "max-width": 200 } }}
                        label="EPG Gathering Interval"
                        suffix="ms"
                        placeholder="1800000"
                        value={`${editing.epgGatheringInterval || ""}`}
                        onChange={(ev, newValue) => {
                            if (newValue === "") {
                                delete editing.epgGatheringInterval;
                            } else if (/^[0-9]+$/.test(newValue)) {
                                const int = parseInt(newValue, 10);
                                if (int <= 1000 * 60 * 60 * 24 * 3 && int > 0) {
                                    editing.epgGatheringInterval = int;
                                }
                            }
                            setEditing({ ...editing });
                        }}
                    />

                    <Toggle
                        label={
                            <Stack horizontal verticalAlign="end">
                                <Label>EIT Parsing</Label>
                                <TooltipHost content={
                                    `If running in Docker, Env var \`DISABLE_EIT_PARSING\` is preferred.
                                    ⚠️ If disabled, won't work some clients!`
                                }>
                                    <Icon
                                        iconName="Info"
                                        style={{ marginLeft: 4, marginBottom: 6 }}
                                    />
                                </TooltipHost>
                            </Stack>
                        }
                        checked={(editing.disableEITParsing === undefined || editing.disableEITParsing === false)}
                        onText="Enable"
                        offText="Disable ⚠️"
                        onChange={(ev, checked) => {
                            setEditing({ ...editing, disableEITParsing: checked === false ? true : undefined })
                        }}
                    />

                    <TextField
                        styles={{ fieldGroup: { "max-width": 200 } }}
                        label="Allow IPv4 CIDR Ranges"
                        onRenderLabel={(props) => (
                            <Stack horizontal verticalAlign="end">
                                <Label>{props.label}</Label>
                                <TooltipHost content={
                                    `If running in Docker, Env var \`ALLOW_IPV4_CIDR_RANGES\` is preferred.
                                    ⚠️ Maximum attention required!`
                                }>
                                    <Icon
                                        iconName="Warning"
                                        style={{ marginLeft: 4, marginBottom: 6 }}
                                    />
                                </TooltipHost>
                            </Stack>
                        )}
                        multiline rows={3}
                        value={(editing.allowIPv4CidrRanges || []).join("\n")}
                        onChange={(ev, newValue) => {
                            if (newValue.trim() === "") {
                                setEditing({ ...editing, allowIPv4CidrRanges: null });
                            } else {
                                setEditing({ ...editing, allowIPv4CidrRanges: newValue.split("\n").map(range => range.trim()) })
                            }
                        }}
                    />

                    <TextField
                        styles={{ fieldGroup: { "max-width": 380 } }}
                        label="Allow IPv6 CIDR Ranges"
                        onRenderLabel={(props) => (
                            <Stack horizontal verticalAlign="end">
                                <Label>{props.label}</Label>
                                <TooltipHost content={
                                    `If running in Docker, Env var \`ALLOW_IPV6_CIDR_RANGES\` is preferred.
                                    ⚠️ Maximum attention required!`
                                }>
                                    <Icon
                                        iconName="Warning"
                                        style={{ marginLeft: 4, marginBottom: 6 }}
                                    />
                                </TooltipHost>
                            </Stack>
                        )}
                        multiline rows={3}
                        value={(editing.allowIPv6CidrRanges || []).join("\n")}
                        onChange={(ev, newValue) => {
                            if (newValue.trim() === "") {
                                setEditing({ ...editing, allowIPv6CidrRanges: null });
                            } else {
                                setEditing({ ...editing, allowIPv6CidrRanges: newValue.split("\n").map(range => range.trim()) })
                            }
                        }}
                    />

                    <Stack horizontal tokens={{ childrenGap: "0 8" }} style={{ marginTop: 16 }}>
                        <PrimaryButton text="Save" disabled={!changed || invalid} onClick={() => setShowSaveDialog(true)} />
                        <DefaultButton text="Cancel" disabled={!changed} onClick={() => setEditing({ ...current })} />
                    </Stack>
                </Stack>
            }
            <Dialog
                hidden={!showSaveDialog}
                onDismiss={() => setShowSaveDialog(false)}
                dialogContentProps={{
                    type: DialogType.largeHeader,
                    title: "Save",
                    subText: "Restart is required to apply configuration."
                }}
            >
                <DialogFooter>
                    <PrimaryButton
                        text="Save"
                        onClick={() => {
                            setShowSaveDialog(false);
                            (async () => {
                                for (const key of Object.keys(editing)) {
                                    if (editing[key] === null) {
                                        delete editing[key];
                                    }
                                }
                                console.log("ServerConfigurator", "PUT", configAPI, "<-", editing);
                                await fetch(configAPI, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json; charset=utf-8" },
                                    body: JSON.stringify(editing)
                                });
                                setSaved(true);
                            })();
                        }}
                    />
                    <DefaultButton
                        text="Cancel"
                        onClick={() => setShowSaveDialog(false)}
                    />
                </DialogFooter>
            </Dialog>
        </>
    );
};

export default Configurator;
