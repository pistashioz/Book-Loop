function setTokenCookies(res, accessToken, refreshToken) {
    const accessTokenExpiry = new Date(dayjs().add(config.accessTokenExpiryMinutes, 'minutes').valueOf());
    const refreshTokenExpiry = new Date(dayjs().add(config.refreshTokenExpiryDays, 'minutes').valueOf());

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // secure in production
        expires: accessTokenExpiry,
        sameSite: 'Strict'
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // secure in production
        expires: refreshTokenExpiry,
        path: '/refresh',
        sameSite: 'Strict'
    });
}
