import { expect, test, describe } from "vitest";
import { extractProcessors, extractSteps, Source } from "@rdfc/js-runner";

const pipeline = `
        @prefix js: <https://w3id.org/conn/js#>.
        @prefix ws: <https://w3id.org/conn/ws#>.
        @prefix : <https://w3id.org/conn#>.
        @prefix owl: <http://www.w3.org/2002/07/owl#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        @prefix sh: <http://www.w3.org/ns/shacl#>.

        <> owl:imports <./node_modules/@rdfc/js-runner/ontology.ttl>, <./processor.ttl>.

        [ ] a :Channel;
            :reader <incoming>.
        [ ] a :Channel;
            :writer <outgoing>.
        <incoming> a js:JsReaderChannel.
        <outgoing> a js:JsWriterChannel.

        [ ] a js:Buffer;
            js:incoming <incoming>;
            js:outgoing <outgoing>;
            js:interval 2000;
            js:amount 2;
            js:minAmount 2.
    `;

describe("processor", () => {
    test("definition", async () => {
        expect.assertions(8);

        const source: Source = {
            value: pipeline,
            baseIRI: process.cwd() + "/config.ttl",
            type: "memory",
        };

        // Parse pipeline into processors.
        const {
            processors,
            quads,
            shapes: config,
        } = await extractProcessors(source);

        // Extract the Buffer processor.
        const env = processors.find((x) => x.ty.value.endsWith("Buffer"))!;
        expect(env).toBeDefined();

        const args = extractSteps(env, quads, config);
        expect(args.length).toBe(1);
        expect(args[0].length).toBe(5);

        const [[incoming, outgoing, interval, amount, minAmount]] = args;
        expect(incoming.ty.id).toBe("https://w3id.org/conn/js#JsReaderChannel");
        expect(outgoing.ty.id).toBe("https://w3id.org/conn/js#JsWriterChannel");
        expect(parseInt(interval)).toBe(2000);
        expect(parseInt(amount)).toBe(2);
        expect(parseInt(minAmount)).toBe(2);
    });
});
