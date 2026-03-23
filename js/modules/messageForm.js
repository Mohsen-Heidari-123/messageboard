import { postMessage } from '../firebase/firebase.js'
import { getUsername } from './username.js'
import { showAdVideo } from "./addvertisement.js";
import { censorBadWords } from "./censor.js";

const emojiCodes = [0x1F604, 0x1F602, 0x1F60D, 0x1F60E, 0x1F525, 0x1F680];

export const createFlowerForm = () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("form-wrapper");

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "X";
    cancelBtn.classList.add("cancelBtn");
    cancelBtn.addEventListener("click", () => wrapper.remove());

    const form = document.createElement("form");

    const title = document.createElement("input");
    title.placeholder = "Title";

    const message = document.createElement("textarea");
    message.placeholder = "Message";
    message.maxLength = 100;

    const charCount = document.createElement("div");
    charCount.textContent = "0 / 100";

    const name = document.createElement("input");
    name.placeholder = "Name";

    const button = document.createElement("button");
    button.textContent = "Send!";
    button.classList.add("sendBtn");

    const emojiSelect = document.createElement("select");
    emojiSelect.classList.add("emoji-select");
    const defaultOption = document.createElement("option");
    defaultOption.textContent = "Select an emoji";
    defaultOption.value = "";
    emojiSelect.appendChild(defaultOption);

    emojiCodes.forEach(code => {
        const option = document.createElement("option");
        option.value = String.fromCodePoint(code);
        option.textContent = String.fromCodePoint(code);
        emojiSelect.appendChild(option);
    })

    message.addEventListener("input", () => {
        const length = Array.from(message.value).length;
        charCount.textContent = `${length} / ${message.maxLength}`;
    });

    emojiSelect.addEventListener("change", () => {
        const emoji = emojiSelect.value;
        if (!emoji) return;

        const start = message.selectionStart;
        const end = message.selectionEnd;
        const text = message.value;

        if (Array.from(message.value).length >= message.maxLength) return;

        message.value = text.slice(0, start) + emoji + text.slice(end);

        message.focus();
        message.selectionStart = message.selectionEnd = start + emoji.length;
        message.dispatchEvent(new Event("input"));

        emojiSelect.value = "";
    });

    const bottomRow = document.createElement("div");
    bottomRow.classList.add("form-bottom-row");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const titleValue = censorBadWords(title.value.trim());
            const messageValue = censorBadWords(message.value.trim());
            const nameValue = censorBadWords(name.value.trim());

            await postMessage(messageValue, nameValue, titleValue);
            showAdVideo();
            wrapper.remove();
            console.log("message sent!");
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    });

    bottomRow.append(charCount, emojiSelect);
    form.append(name, title, message, bottomRow, button);
    wrapper.append(cancelBtn, form);
    document.body.append(wrapper);
};
