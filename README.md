# browser-cli-tool

Runs puppeteer and outputs any console output to the CLI. Great for LLMs to debug browser code.

## Installation

```
npm install -g browser-cli-tool
```

## Usage

```
Usage: browser <url> "[commands]"

A command-line tool to automate browser actions.

Commands:
  wait <time>       Waits for a specified time (e.g., 5s, 1000ms).
  click <selector>  Clicks an element.

Example:
  browser https://example.com "click .some-button wait 5s"
```

## AI Rule

```
If you want to read browser's console output, run a command like this: `python3 -m http.server 8000 > /dev/null 2>&1 & server_pid=$!; sleep 2; browser http://localhost:8000/index.html "wait 1s click #testButton" 2>&1; kill $server_pid 2>/dev/null`.
```

## License

MIT
