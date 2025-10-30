# buffer-processor-ts

[![Build and tests with Node.js](https://github.com/rdf-connect/buffer-processor-ts/actions/workflows/build-test.yml/badge.svg)](https://github.com/rdf-connect/buffer-processor-ts/actions/workflows/build-test.yml)

This repository contains a processor to buffer data for the RDF Connect framework.
At a certain interval, the processor will pipe through a given amount of data from the incoming stream to the outgoing
stream.


## Configuration

The processor can be configured using the following parameters:

* `incoming`: The incoming stream to buffer.
* `outgoing`: The outgoing stream to pipe the buffered data to.
* `interval`: The interval at which the processor should pipe through data from the incoming stream. The default value
  is `1000` milliseconds.
* `amount`: The amount of data that should be piped through from the incoming stream at each interval. Use `0` to pipe
  through all available data. The default value is `0`.
* `minAmount`: The minimum amount of data that should be piped through from the incoming stream at each interval. The
  default value is `1`.

## Installation

```
npm install
npm run build
```

Or install from NPM:

```
npm install @rdfc/buffer-processor-ts
```

## Example

An example configuration of the processor can be found in the `example` directory.

You can run this example by executing the following command:

```bash
cd example
npm i
npx rdfc pipeline.ttl
```

To enable all debug logs, add `DEBUG=*` before the command:

```bash
DEBUG=rdfc npx rdfc pipeline.ttl
```
