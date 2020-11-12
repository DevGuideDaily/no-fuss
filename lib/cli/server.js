import express from "express";
import livereload from "livereload";
import connectLivereload from "connect-livereload";

export const startServer = ({ outDirPath, port }) => {
	const liveReloadServer = livereload.createServer();
	liveReloadServer.watch(outDirPath);

	const server = express();
	server.use(connectLivereload());
	server.use(express.static(outDirPath, { extensions: ["html"] }));
	server.listen(port, () => console.log(`✅ Listening on http://localhost:${port}`));
}
