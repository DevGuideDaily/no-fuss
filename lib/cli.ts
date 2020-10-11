import commander from "commander";
import { runBuild, runServe, runWatch } from "./cli/commands";

const program = new commander.Command();

program.version("0.0.1");
program.option("-s, --src-dir <path>", "Source directory");
program.option("-o, --out-dir <path>", "Output directory");
program.option("-p, --port <number>", "Port number (5000)")

program.command("watch").action(cmd => runWatch(cmd.parent));
program.command("build").action(cmd => runBuild(cmd.parent));
program.command("serve", { isDefault: true })
	.action(cmd => runServe(cmd.parent));

console.log();
program.parse(process.argv);
