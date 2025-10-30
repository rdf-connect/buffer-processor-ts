import { Processor, Reader, Writer } from "@rdfc/js-runner";
import { getLoggerFor } from "./utils/logUtil";
import Queue from "queue-fifo";

const logger = getLoggerFor("buffer");

/**
 * The buffer function is a very simple processor which simply buffers the
 * incoming stream and forwards it to the outgoing stream at every interval.
 * The amount of members to send through at each interval can be configured.
 *
 * @param incoming The data stream with the incoming data.
 * @param outgoing The data stream to which the buffered data should be forwarded.
 * @param interval The interval at which the data should be forwarded, in
 * milliseconds. The default is 1000 ms.
 * @param amount The amount of members to forward at each interval. If set to 0,
 * all currently buffered members will be forwarded. The default is 0.
 * @param minAmount The minimum amount of members to forward at each interval.
 * If the buffer contains less than this amount, the buffer will wait for the
 * next interval before forwarding the data. The default is 1.
 */
export type Args = {
    incoming: Reader;
    outgoing: Writer;
    interval: number;
    amount: number;
    minAmount: number;
};

export class Buffer extends Processor<Args> {
    private readonly queue = new Queue<Uint8Array>();
    private queueCleared: ((value: void) => void) | null = null;
    async init(this: Args & this): Promise<void> {
        this.interval = this.interval ?? 1000;
        this.amount = this.amount ?? 0;
        this.minAmount = this.minAmount ?? 1;
    }
    async transform(this: Args & this): Promise<void> {
        for await (const st of this.incoming.buffers()) {
            this.queue.enqueue(st);
        }

        this.logger.info("Incoming stream terminated.");
        await new Promise((resolve) => {
            this.queueCleared = resolve;
        });
        await this.outgoing
            .close()
            .then(() => this.logger.info("Outgoing stream terminated."))
            .finally();
    }
    async produce(this: Args & this): Promise<void> {
        let busy = false;
        const toPush = new Queue<Uint8Array>();
        const id = setInterval(async () => {
            if (
                this.queue.size() >= this.minAmount ||
                this.queueCleared !== null
            ) {
                let i = 0;
                while (
                    (i < this.amount && this.queueCleared === null) ||
                    (this.amount === 0 && !this.queue.isEmpty()) ||
                    (this.queueCleared !== null &&
                        !this.queue.isEmpty() &&
                        i < this.amount)
                ) {
                    const data = this.queue.dequeue();
                    if (data !== null) {
                        toPush.enqueue(data);
                        i++;
                    }
                }
                logger.debug(`Forwarding ${i} members from the buffer.`);

                if (this.queueCleared !== null && this.queue.isEmpty()) {
                    clearInterval(id);
                }

                if (!busy) {
                    busy = true;
                    while (!toPush.isEmpty()) {
                        const pushing = toPush.dequeue();
                        if (pushing !== null) {
                            await this.outgoing.buffer(pushing);
                        }
                    }
                    busy = false;
                }

                if (
                    this.queueCleared !== null &&
                    this.queue.isEmpty() &&
                    toPush.isEmpty()
                ) {
                    this.queueCleared();
                }
            } else {
                this.logger.debug(
                    `Buffer contains ${this.queue.size()} members, but the minimum amount is ${this.minAmount}. Waiting for the next interval.`,
                );
            }
        }, this.interval);
    }
}
