import { MessageEvent, InMessage } from "@replikit/core/typings";
import { MessageContext as _MessageContext } from "@replikit/router/typings";
import { MemberContext } from "@replikit/router";

export class MessageContext<T extends MessageEvent = MessageEvent> extends MemberContext<T> {
    get message(): InMessage {
        return this.event.payload.message;
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MessageContext extends _MessageContext {}
