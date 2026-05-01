export function generateTimestamp(): string {
	return new Date().toISOString();
}

export function generateFilename(): string {
	const now = new Date();
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.md`;
}

export function isIncubated(capturedAt: string, incubationHours: number): boolean {
	const captured = new Date(capturedAt);
	const cutoff = new Date(captured.getTime() + incubationHours * 60 * 60 * 1000);
	return new Date() >= cutoff;
}

export function makeUniqueFilename(vaultNameCheck: (name: string) => boolean, baseName: string): string {
	if (!vaultNameCheck(baseName)) {
		return baseName;
	}
	let counter = 1;
	const extIndex = baseName.lastIndexOf(".");
	const stem = extIndex > 0 ? baseName.slice(0, extIndex) : baseName;
	const ext = extIndex > 0 ? baseName.slice(extIndex) : "";
	while (true) {
		const candidate = `${stem}-${counter}${ext}`;
		if (!vaultNameCheck(candidate)) {
			return candidate;
		}
		counter++;
		if (counter > 999) {
			throw new Error(`Could not generate unique filename for ${baseName}`);
		}
	}
}
