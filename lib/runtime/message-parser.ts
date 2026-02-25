export interface BoltArtifactData {
    id: string;
    title: string;
}

export interface BoltActionData {
    type: 'file' | 'shell';
    content: string;
    filePath?: string;
}

export type ArtifactCallback = (data: BoltArtifactData) => void;
export type ActionCallback = (data: BoltActionData) => void;

export class BoltMessageParser {
    private buffer: string = '';
    private currentArtifact: BoltArtifactData | null = null;
    private currentAction: Partial<BoltActionData> | null = null;

    constructor(
        private onArtifactOpen?: ArtifactCallback,
        private onArtifactClose?: (data: BoltArtifactData) => void,
        private onActionOpen?: (data: BoltActionData) => void,
        private onActionClose?: (data: BoltActionData) => void,
    ) { }

    parse(chunk: string) {
        this.buffer += chunk;
        this.processBuffer();
    }

    private processBuffer() {
        let processed = false;

        // Check for artifact opening - attributes can appear in any order
        if (!this.currentArtifact) {
            const artifactMatch = this.buffer.match(/<boltArtifact\s[^>]*>/);
            if (artifactMatch) {
                const tagStr = artifactMatch[0];
                const idMatch = tagStr.match(/id="([^"]+)"/);
                const titleMatch = tagStr.match(/title="([^"]+)"/);
                if (idMatch && titleMatch) {
                    this.currentArtifact = {
                        id: idMatch[1],
                        title: titleMatch[1],
                    };
                    this.onArtifactOpen?.(this.currentArtifact);
                    this.buffer = this.buffer.substring(artifactMatch.index! + artifactMatch[0].length);
                    processed = true;
                }
            }
        }

        // Check for action opening
        if (this.currentArtifact && !this.currentAction) {
            const actionMatch = this.buffer.match(/<boltAction\s+type="(file|shell)"(?:\s+filePath="([^"]+)")?>/);
            if (actionMatch) {
                this.currentAction = {
                    type: actionMatch[1] as 'file' | 'shell',
                    filePath: actionMatch[2],
                    content: '',
                };
                this.onActionOpen?.(this.currentAction as BoltActionData);
                this.buffer = this.buffer.substring(actionMatch.index! + actionMatch[0].length);
                processed = true;
            }
        }

        // Check for action closing
        if (this.currentAction) {
            const closeActionMatch = this.buffer.match(/<\/boltAction>/);
            if (closeActionMatch) {
                // Content is everything before the closing tag, minus any trailing whitespace if needed? 
                // For strict XML parsing, we take exactly what's there.
                const content = this.buffer.substring(0, closeActionMatch.index!);
                this.currentAction.content += content;

                this.onActionClose?.({
                    ...this.currentAction as BoltActionData,
                    content: this.currentAction.content || '',
                });

                this.currentAction = null;
                this.buffer = this.buffer.substring(closeActionMatch.index! + closeActionMatch[0].length);
                processed = true;
            } else {
                // If no closing tag yet, we can append content safely ONLY if we are sure we aren't eating into a partial closing tag.
                // A simple heuristic is to keep the last few chars in the buffer if they look like they could be part of </boltAction>.
                // </boltAction> is 13 chars.
                const safeLength = this.buffer.length - 15;
                if (safeLength > 0) {
                    const safeContent = this.buffer.substring(0, safeLength);
                    this.currentAction.content += safeContent;
                    this.buffer = this.buffer.substring(safeLength);
                }
            }
        }

        // Check for artifact closing
        if (this.currentArtifact && !this.currentAction) {
            const closeArtifactMatch = this.buffer.match(/<\/boltArtifact>/);
            if (closeArtifactMatch) {
                this.onArtifactClose?.(this.currentArtifact);
                this.currentArtifact = null;
                this.buffer = this.buffer.substring(closeArtifactMatch.index! + closeArtifactMatch[0].length);
                processed = true;
            }
        }

        // If we processed something, try again (for multiple tags in one chunk)
        if (processed) {
            this.processBuffer();
        }
    }
}
