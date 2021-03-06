import {
    OutMessage,
    ChannelInfo,
    AccountInfo,
    ResolvedMessage,
    SendedMessage,
    ResolvedAttachment,
    Attachment,
    FeatureMap,
    TextToken,
    InMessage,
    EventName,
    EventMap,
    MessageEventName,
    MessageMetadata,
    InlineQueryResponse,
    Identifier,
    PartialBy
} from "@replikit/core/typings";
import { IncomingMessage, ServerResponse } from "http";
import {
    CacheManager,
    config,
    TextTokenizer,
    processEvent,
    TextFormatter,
    MissingMetadataError,
    EmptyContentError
} from "@replikit/core";

export interface BaseControllerOptions {
    name: string;
    textTokenizer?: TextTokenizer;
    textFormatter?: TextFormatter;
    features?: Partial<FeatureMap>;
}

export interface ControllerBotInfo {
    id: number;
    username: string;
}

export abstract class Controller {
    private static defaultTextFormatter = new TextFormatter();

    private readonly accountInfoCache: CacheManager<Identifier, AccountInfo | undefined>;
    private readonly channelInfoCache: CacheManager<Identifier, ChannelInfo | undefined>;

    readonly name: string;
    readonly features: FeatureMap;

    private static featureMapDefaults: FeatureMap = {
        implicitUpload: false,
        webhook: false,
        inlineMode: false,
        inlineButtons: false
    };

    constructor(private readonly options: BaseControllerOptions) {
        this.name = options.name;
        this.features = {
            ...Controller.featureMapDefaults,
            ...options.features
        };
        this.accountInfoCache = new CacheManager(
            this.fetchAccountInfo.bind(this),
            config.core.cache.expire
        );
        this.channelInfoCache = new CacheManager(
            this.fetchChannelInfo.bind(this),
            config.core.cache.expire
        );

        if (options.textTokenizer) {
            const tokenizer = options.textTokenizer;
            this.tokenizeText = (message): TextToken[] => tokenizer.tokenize(message.text);
        }

        if (options.textFormatter) {
            const formatter = options.textFormatter;
            this.formatText = formatter.formatText.bind(formatter);
        }
    }

    protected _botInfo: ControllerBotInfo;

    get botInfo(): ControllerBotInfo {
        return this._botInfo;
    }

    protected processSendedMessage(sendedMessages: SendedMessage): Promise<SendedMessage> {
        return Promise.resolve(sendedMessages);
    }

    async sendMessage(channelId: Identifier, message: OutMessage): Promise<SendedMessage> {
        const attachments = await this.resolveAttachments(channelId, message);
        const sendedMessage = await this.sendResolvedMessage(channelId, {
            ...message,
            text: this.formatText(message.tokens),
            attachments
        } as ResolvedMessage);
        if (!sendedMessage) {
            throw new EmptyContentError();
        }
        return this.processSendedMessage(sendedMessage);
    }

    async editMessage(channelId: Identifier, message: OutMessage): Promise<SendedMessage> {
        if (!message.metadata) {
            throw new MissingMetadataError();
        }
        const attachments = await this.resolveAttachments(channelId, message);
        const editedMessage = await this.editResolvedMessage(channelId, {
            ...message,
            text: this.formatText(message.tokens),
            attachments
        } as ResolvedMessage);
        if (!editedMessage) {
            throw new EmptyContentError();
        }
        return this.processSendedMessage(editedMessage);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    answerInlineQuery(id: string, response: InlineQueryResponse): Promise<void> {
        throw new Error("Method not implemented");
    }

    protected async _resolveSource(
        channelId: Identifier,
        attachment: Attachment
    ): Promise<string | undefined> {
        if (attachment.controllerName === this.name) {
            return attachment.uploadId ?? attachment.id;
        }
        return this.features.implicitUpload
            ? attachment.url!
            : await this.uploadAttachment!(channelId, attachment);
    }

    protected resolveSource(
        channelId: Identifier,
        attachment: Attachment
    ): Promise<string | undefined> {
        return this._resolveSource(channelId, attachment);
    }

    private async resolveAttachments(
        channelId: Identifier,
        message: OutMessage
    ): Promise<ResolvedAttachment[]> {
        const attachments: ResolvedAttachment[] = [];
        for (const attachment of message.attachments) {
            const source = await this.resolveSource(channelId, attachment);
            if (source) {
                attachments.push({
                    ...attachment,
                    source,
                    controllerName: attachment.controllerName ?? this.name
                });
            }
        }
        return attachments;
    }

    getChannelInfo(channelId: Identifier): Promise<ChannelInfo | undefined> {
        return this.channelInfoCache.get(channelId);
    }

    getAccountInfo(accountId: Identifier): Promise<AccountInfo | undefined> {
        return this.accountInfoCache.get(accountId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenizeText(message: InMessage): TextToken[] {
        throw new Error("TextTokenizer not provided");
    }

    formatText(tokens: TextToken[]): string {
        return Controller.defaultTextFormatter.formatText(tokens);
    }

    abstract deleteMessage(channelId: Identifier, metadata: MessageMetadata): Promise<void>;

    start(): Promise<void> {
        return Promise.resolve();
    }

    stop(): Promise<void> {
        return Promise.resolve();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleRequest(req: IncomingMessage, res: ServerResponse): void {
        throw new Error("Method not implemented");
    }

    protected processEvent<T extends EventName>(
        type: T,
        event: Omit<EventMap[T], "controller">
    ): void {
        (event as EventMap[T]).controller = this;
        processEvent(type, event as EventMap[T]);
    }

    private setControllerName(message: InMessage): void {
        for (const attachment of message.attachments) {
            attachment.controllerName = this.name;
        }
        for (const forwarded of message.forwarded) {
            this.setControllerName(forwarded);
        }
        if (message.reply) {
            this.setControllerName(message.reply);
        }
        if (message.account.avatar) {
            message.account.avatar.controllerName = this.name;
        }
    }

    protected processMessageEvent(type: MessageEventName, message: InMessage): void {
        this.setControllerName(message);
        this.processEvent(type, {
            message,
            account: message.account,
            channel: message.channel
        });
    }

    protected processMessageLikeEvent<T extends MessageEventName>(
        type: T,
        payload: PartialBy<EventMap[T], "account" | "channel" | "controller">
    ): void {
        this.setControllerName(payload.message);
        this.processEvent(type, {
            account: payload.message.account,
            channel: payload.message.channel,
            ...payload
        } as EventMap[T]);
    }

    protected uploadAttachment?(
        channelId: Identifier,
        attachment: Attachment
    ): Promise<string | undefined>;

    protected abstract fetchChannelInfo(localId: Identifier): Promise<ChannelInfo | undefined>;
    protected abstract fetchAccountInfo(localId: Identifier): Promise<AccountInfo | undefined>;

    protected abstract sendResolvedMessage(
        channelId: Identifier,
        message: ResolvedMessage
    ): Promise<SendedMessage | undefined>;

    protected abstract editResolvedMessage(
        channelId: Identifier,
        message: ResolvedMessage
    ): Promise<SendedMessage | undefined>;
}
