export function stripIndents(value: string | TemplateStringsArray, ...args: any[]) {
    const parts = [value] as string[];
    let result = parts[0];

    if (Array.isArray(value)) {
        const templates = value as TemplateStringsArray;
        result = templates[0];
        for (let i = 0; i < args.length; i++) {
            result += args[i] + templates[i + 1];
        }
    }

    return result.replace(/^[ \t]+/gm, '');
}
