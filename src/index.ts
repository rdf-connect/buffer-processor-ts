import { Stream, Writer } from "@rdfc/js-runner";
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
export function buffer(
    incoming: Stream<string>,
    outgoing: Writer<string>,
    interval: number = 1000,
    amount: number = 0,
    minAmount: number = 1,
): () => Promise<void> {
    /**************************************************************************
     * This is where you set up your processor. This includes reading         *
     * configuration files, initializing class instances, etc. You are        *
     * guaranteed that no data will flow in the pipeline as long as your      *
     * processor function has not returned here.                              *
     *                                                                        *
     * You must therefore initialize the data handlers, but you may not push  *
     * any data into the pipeline here.                                       *
     **************************************************************************/

    const queue = new Queue<string>();

    incoming.on("data", (data) => {
        queue.enqueue(data);
    });

    // If a processor upstream terminates the channel, we propagate this change
    // onto the processors downstream.
    let queueCleared: ((value: void) => void) | null = null;
    incoming.on("end", async () => {
        logger.info("Incoming stream terminated.");
        await new Promise((resolve) => {
            queueCleared = resolve;
        });
        outgoing
            .end()
            .then(() => logger.info("Outgoing stream terminated."))
            .finally();
    });

    /**************************************************************************
     * Any code that must be executed after the pipeline goes online must be  *
     * embedded in the returned function. This guarantees that all channels   *
     * are initialized and the other processors are available. A common use   *
     * case is the source processor, which introduces data into the pipeline  *
     * from an external source such as the file system or an HTTP API, since  *
     * these must be certain that the downstream processors are ready and     *
     * awaiting data.                                                         *
     *                                                                        *
     * Note that this entirely optional, and you may return void instead.     *
     **************************************************************************/
    let busy = false;
    const toPush = new Queue<string>();
    return async () => {
        const id = setInterval(async () => {
            if (queue.size() >= minAmount || queueCleared !== null) {
                let i = 0;
                while (
                    (i < amount && queueCleared === null) ||
                    (amount === 0 && !queue.isEmpty()) ||
                    (queueCleared !== null && !queue.isEmpty() && i < amount)
                ) {
                    const data = queue.dequeue();
                    if (data !== null) {
                        toPush.enqueue(data);
                        i++;
                    }
                }
                logger.debug(`Forwarding ${i} members from the buffer.`);

                if (queueCleared !== null && queue.isEmpty()) {
                    clearInterval(id);
                }

                if (!busy) {
                    busy = true;
                    while (!toPush.isEmpty()) {
                        const pushing = toPush.dequeue();
                        if (pushing !== null) {
                            await outgoing.push(pushing);
                        }
                    }
                    busy = false;
                }

                if (
                    queueCleared !== null &&
                    queue.isEmpty() &&
                    toPush.isEmpty()
                ) {
                    queueCleared();
                }
            } else {
                logger.debug(
                    `Buffer contains ${queue.size()} members, but the minimum amount is ${minAmount}. Waiting for the next interval.`,
                );
            }
        }, interval);
    };
}
