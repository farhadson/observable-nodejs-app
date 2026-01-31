function uniqueSuffix() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uniqueEmail(prefix = "user") {
    return `${prefix}-${uniqueSuffix()}@example.com`;
}

function pickIdFromCreateResponse(res) {
    const body = res?.data;
    // Try a few common shapes: {id}, {data:{id}}, {user:{id}}, {data:{user:{id}}}
    return (
        body?.id ??
        body?.data?.id ??
        body?.user?.id ??
        body?.data?.user?.id ??
        null
    );
}

function pickTokenFromLoginResponse(res) {
    const body = res?.data;
    return body?.token ?? body?.data?.token ?? null;
}

module.exports = {
    uniqueEmail,
    pickIdFromCreateResponse,
    pickTokenFromLoginResponse,
};
