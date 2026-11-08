import { createAuth } from "../../../../lib/server/auth";

function handleAuth(request: Request) {
    return createAuth().handler(request);
}

export const GET = ({ request }) => {
    return handleAuth(request);
};

export const POST = ({ request }) => {
    return handleAuth(request);
};
