import { buffer } from "../src";
import { SimpleStream } from "@rdfc/js-runner";
import { describe, expect, test } from "vitest";

describe("log", () => {
    test("successful", async () => {
        expect.assertions(8);

        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();

        const output: [string, number][] = [];
        const promise = new Promise<void>((resolve) => {
            outgoing.on("data", (data) => {
                output.push([data, Date.now()]);

                if (output.length === 4) {
                    resolve();
                }
            });
        });

        // Log when data has arrived and check if the difference in timestamps is as expected.

        // Initialize the processor.
        const startLogging = buffer(incoming, outgoing, 1000, 2, 2);
        await startLogging();

        // Push all messages into the pipeline.
        await incoming.push("Hello, World!");
        await incoming.push("This is a second message");
        await incoming.push("I wish you a good day.");
        await incoming.push("Goodbye.");

        await incoming.end();

        // Wait for the processor to finish.
        await promise;

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
