type HookEvent = {
    type: string;
    action: string;
    context: {
        workspaceDir?: string;
        [key: string]: any;
    };
};
type HookHandler = (event: HookEvent) => Promise<void>;
declare const handler: HookHandler;
export default handler;
