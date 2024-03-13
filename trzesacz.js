const fs = require("fs");
const rp = require("request-promise");
const cheerio = require("cheerio");

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

async function main() {
    console.log("[>] requesting");
    const html = await rp({ method: "get", url: "http://osrodektrzesacz.pl/2017/11/09/witaj-swiecie/" });
    console.log(`[+] response size ${html.length} bytes`);
    getAllComments(html);
}

main();