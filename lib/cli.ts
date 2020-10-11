import commander from "commander";
import { runBuild, runServe, runWatch } from "./cli/commands";

const program = new commander.Command();

program.version("0.0.1");
program.option("-s, --src-dir <path>", "Source directory");
program.option("-o, --out-dir <path>", "Output directory");

program.command("watch")
	.description("Watch source files for change and build incrementally")
	.action(cmd => runWatch(cmd.parent));

program.command("build")
	.description("Build source files once for production")
	.action(cmd => runBuild(cmd.parent));

program.command("serve", { isDefault: true })
	.description("Watch source files for change and start a development server")
	.option("-p, --port <number>", "Port number (5000)")
	.action(cmd => runServe({
		srcDir: cmd.parent.srcDir,
		outDir: cmd.parent.outDir,
		port: cmd.port
	}));

console.log();
program.parse(process.argv);
