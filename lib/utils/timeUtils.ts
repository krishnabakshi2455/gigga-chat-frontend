export const formatTime = (time: string) => {
    const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "numeric" };
    return new Date(time).toLocaleString("en-US", options);
};