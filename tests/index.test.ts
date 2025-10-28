import { FullProc } from "@rdfc/js-runner";
import { Buffer } from "../src";
import { channel, createRunner } from "@rdfc/js-runner/lib/testUtils";
import { describe, expect, test } from "vitest";
import { createLogger } from "winston";

describe("log", () => {
    test("successful", async () => {
        expect.assertions(8);

        const runner = createRunner();
        const [incoming, incomingReader] = channel(runner, "incoming");
        const [outgoingWriter, outgoingReader] = channel(runner, "outgoing");

        const output: [string, number][] = [];
        let resolve: (v: void) => void = () => {};
        const promise = new Promise((res) => (resolve = res));
        (async () => {
            for await (const st of outgoingReader.strings()) {
                console.log("Got string ", st);
                output.push([st, Date.now()]);
                if (output.length === 4) {
                    resolve();
                }
            }
        })();

        // Log when data has arrived and check if the difference in timestamps is as expected.

        // Initialize the processor.
        const startLogging = <FullProc<Buffer>>new Buffer(
            {
                incoming: incomingReader,
                outgoing: outgoingWriter,
                interval: 1000,
                minAmount: 2,
                amount: 2,
            },
            createLogger(),
        );
        await startLogging.init();

        const outputPromise = Promise.all([
            startLogging.transform(),
            startLogging.produce(),
        ]);

        // Push all messages into the pipeline.
        await incoming.string("Hello, World!");
        await incoming.string("This is a second message");
        await incoming.string("I wish you a good day.");
        await incoming.string("Goodbye.");

        await incoming.close();

        // Wait for the processor to finish.
        await promise;
        await outputPromise;

        // Check if the messages arrived in the correct order and according to the interval.
        expect(output.length).toBe(4);
        expect(output[0][0]).toBe("Hello, World!");
        expect(output[1][0]).toBe("This is a second message");
        expect(output[2][0]).toBe("I wish you a good day.");
        expect(output[3][0]).toBe("Goodbye.");

        // The first and second, and the third and fourth message should be sent together, so the difference in timestamps should definitely be less than 250 ms.
        expect(output[1][1] - output[0][1]).toBeLessThan(250);
        expect(output[3][1] - output[2][1]).toBeLessThan(250);

        // The third message should be sent an interval after the second message, so the difference in timestamps should at least be greater than 750 ms.
        expect(output[2][1] - output[1][1]).toBeGreaterThan(750);
    }, 10000);
});
