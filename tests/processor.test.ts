import { expect, test, describe } from "vitest";
import { ProcHelper } from "@rdfc/js-runner/lib/testUtils";
import { Buffer } from "../";
import { resolve } from "path";
import { Args } from "../src";

const pipeline = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.
        <http://example.org/proc> a rdfc:Buffer;
            rdfc:incoming <incoming>;
            rdfc:outgoing <outgoing>;
            rdfc:interval 2000;
            rdfc:amount 2;
            rdfc:minAmount 2.
    `;

describe("processor", () => {
    test("definition", async () => {
        expect.assertions(8);

        const helper = new ProcHelper<Buffer>();

        await helper.importFile(resolve("./processor.ttl"));
        await helper.importInline(resolve("./pipeline.ttl"), pipeline);

        const config = helper.getConfig("Buffer");

        expect(config.location).toBeDefined();
        expect(config.clazz).toBe("Buffer");
        expect(config.file).toBeDefined();

        const proc = <Buffer & Args>(
            await helper.getProcessor("http://example.org/proc")
        );

        expect(proc.incoming.constructor.name).toBe("ReaderInstance");
        expect(proc.outgoing.constructor.name).toBe("WriterInstance");
        expect(proc.interval).toBe(2000);
        expect(proc.amount).toBe(2);
        expect(proc.minAmount).toBe(2);
    });
});
