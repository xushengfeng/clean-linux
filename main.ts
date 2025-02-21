import { execSync } from "node:child_process";
import { checkbox } from "npm:@inquirer/prompts";

const l: Record<
	string,
	{
		com: string;
		file: string;
		sudo?: true;
		type: "sys pak" | "sys log" | "code lib" | "trash" | "other";
		dec?: string;
	}
> = {
	pacman: {
		sudo: true,
		com: "yes | sudo pacman -Scc",
		file: "echo /var/cache/pacman/pkg/",
		type: "sys pak",
	},
	yay: {
		sudo: true,
		com: "yes | yay -Scc",
		file: "echo ~/.cache/yay",
		type: "sys pak",
	},
	pnpm: { com: "pnpm store prune", file: "pnpm store path", type: "code lib" },
	pip: { com: "pip cache purge", file: "echo ~/.cache/pip", type: "code lib" },
	trash: {
		com: "rm -r ~/.local/share/Trash",
		file: "echo ~/.local/share/Trash/files",
		type: "trash",
	},
};

const willRun: { name: string; size: number }[] = [];

function sumSize(path: string): number {
	const stat = Deno.statSync(path);
	if (stat.isSymlink) return 0;
	if (stat.isFile) {
		return stat.size;
	}
	if (stat.isDirectory) {
		let sum = 0;
		for (const entry of Deno.readDirSync(path)) {
			const entryPath = `${path}/${entry.name}`;
			sum += sumSize(entryPath);
		}
		return sum;
	}
	return 0;
}

function showSize(s: number) {
	const mb = s / 1024 / 1024;
	if (mb < 1) return `${Math.round(s / 1024)}K`;
	const gb = mb / 1024;
	if (gb < 1) return `${Math.round(mb)}M`;
	return `${Math.round(gb)}G`;
}

for (const [n, v] of Object.entries(l)) {
	try {
		const filePath = execSync(v.file).toString().trim();
		const size = sumSize(filePath);
		if (size < 1024) continue;
		willRun.push({ name: n, size: size });
	} catch (_error) {
		// ignore
	}
}

const runL = await checkbox({
	message: "Select to clean",
	choices: willRun.map((i) => ({
		value: i.name,
		description: showSize(i.size),
		checked: true,
	})),
});

for (const n of runL) {
	try {
		execSync(l[n].com);
		console.log(`${n} ✅`);
	} catch (error) {
		console.log(error);
	}
}

let beforeSize = 0;
for (const i of willRun) {
	beforeSize += i.size;
}

let afterSize = 0;
for (const i of willRun) {
	try {
		const filePath = execSync(l[i.name].file).toString().trim();
		const size = sumSize(filePath);
		afterSize += size;
	} catch (_error) {
		//
	}
}

console.log(showSize(beforeSize - afterSize));

Deno.exit();
