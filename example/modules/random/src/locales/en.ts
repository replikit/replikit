import { locales } from "@replikit/i18n";
import { descriptions } from "@replikit/help";
import { RandomLocale } from "@example/random";

locales.add("en", RandomLocale, {
    channelPhotoDeleted: "Channel photo deleted",
    channelPhotoEdited: "Channel photo edited:",
    accountJoined: account => `${account.username} join the channel`,
    accountLeft: account => `${account.username} left the channel`,
    channelTitleEdited: channel => `Channel title edited: ${channel.title}`,
    userEditedMessage: account => `@${account.username} just edited a message`,
    userDeletedMessage: account => `@${account.username} just deleted a message`,
    dataDeleted: "[DATA DELETED]",
    keepSilence: "keep silence",
    deactivateSilentMode: "deactivate silent mode",
    silentModeActivated: "Silent mode activated",
    silentModeDeactivated: "Silent mode deactivated"
});

descriptions.add("en", {
    edit: "Edits the message",
    delete: "Deletes the message",
    calc: {
        sum: "Sums two numbers",
        mul: "Multiplies two numbers"
    },
    test: "Displays the info about message",
    tokenize: "Splits the message text into tokens",
    format: "Creates a text message from the array of tokens"
});
