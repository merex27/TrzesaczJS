const fs = require("fs");
const rp = require("request-promise");
const cheerio = require("cheerio");

let previousComments = [];

function parseComment($, comment) {
    const author = $(comment.find(".comment-author a")[0]);
    const content = $(comment.find(".comment-content p")[0]);
    const published = new Date(comment.find(".comment-published").attr("datetime"));
    const id = parseInt(comment.attr("id").replace("li-comment-", ""));
    let parsed = {
        author: { name: author.text(), url: author.attr("href") },
        content: content.html(), published: published.getTime(), id
    };

    const children = comment.find(".children li");
    if (children.length) {
        parsed.children = [];

        for (let child of children) {
            parsed.children.push(parseComment($, $(child)));
        }
    }

    console.log(`[+] comment id ${parsed.id} [${parsed.children ? parsed.children.length : 0} children]`);

    return parsed;
}

function getAllComments(html) {
    console.log("[>] cheerio parsing");
    const $ = cheerio.load(html);
    let parsed_comments = [];

    const comments = $("li.comment.depth-1");
    console.log(`[>] ${comments.length} parent comments`);
    for (let comment of comments) {
        let parsed = parseComment($, $(comment));
        parsed_comments.push(parsed);
    }

    console.log("[>] writing data");
    fs.writeFileSync("comments.json", JSON.stringify(parsed_comments, 0, 4));
    console.log("[+] all done");
}
async function sendMessage(message) {
    // In a real application, you can use a messaging service to send the message.
    console.log(message);
}

async function fetchCommentsAndCompare() {
    console.log(`[>] Requesting at ${new Date().toLocaleString()}`);
    try {
        const html = await rp({ method: "get", url: "http://osrodektrzesacz.pl/2017/11/09/witaj-swiecie/" });
        console.log(`[+] Response size ${html.length} bytes`);
        const currentComments = getAllComments(html);

        const newComments = currentComments.filter(comment => !previousComments.some(prevComment => prevComment.id === comment.id));

        if (newComments.length > 0) {
            console.log(`[+] Found ${newComments.length} new comment(s)`);
            const newCommentsFileName = `new_comments_${Date.now()}.json`;
            fs.writeFileSync(newCommentsFileName, JSON.stringify(newComments, null, 4));
            console.log(`[+] New comments saved to ${newCommentsFileName}`);

            for (const newComment of newComments) {
                const message = `[+] New comment by ${newComment.author.name} at ${new Date(newComment.published).toLocaleString()}`;
                await sendMessage(message);
            }
        } else {
            console.log("[+] No new comments found");
        }

        previousComments = currentComments;
    } catch (err) {
        console.error("Error occurred while fetching or processing comments:", err);
    }
}

async function main() {
    console.log("[+] Starting comment fetcher");

    // Initially fetch and store the comments
    try {
        const html = await rp({ method: "get", url: "http://osrodektrzesacz.pl/2017/11/09/witaj-swiecie/" });
        console.log(`[+] Response size ${html.length} bytes`);
        previousComments = getAllComments(html);
    } catch (err) {
        console.error("Error occurred while fetching or processing comments:", err);
        return;
    }

    fetchCommentsAndCompare();
    setInterval(fetchCommentsAndCompare, 60 * 1000); // Send request every 1 minute
}

main();
