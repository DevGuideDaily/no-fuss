import express from "express";
import livereload from "livereload";
import connectLivereload from "connect-livereload";

export const startServer = ({ outDir, port }) => {
	const liveReloadServer = livereload.createServer();
	liveReloadServer.watch(outDir);

	const server = express();
	server.use(connectLivereload());
	server.use(express.static(outDir, { extensions: ["html"] }));
	server.listen(port, () => console.log(`✅ Listening on http://localhost:${port}`));
}
