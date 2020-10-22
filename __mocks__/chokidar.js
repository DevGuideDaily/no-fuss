const chokidar = jest.createMockFromModule("chokidar");

const listeners = {};

chokidar.watch = () => {
	return {
		on: (event, callback) => listeners[event] = callback,
		unwatch: () => listeners = {},
		close: () => { }
	}
}

chokidar.trigger = (event, path) => {
	const listener = listeners[event];
	if (listener) listener(path);
}

module.exports = chokidar;
