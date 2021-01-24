function parseCommandAndArgs(line) {
    line = line.trim();
    const regex = new RegExp('"[^"]+"|[\\S]+', 'g');
    const arguments = [];
    line.match(regex).forEach(element => {
        if (!element) return;
        return arguments.push(element.replace(/"/g, ''));
    });
    return [arguments[0].toLowerCase(), arguments.slice(1)];
}

module.exports = {
    parseCommandAndArgs
};