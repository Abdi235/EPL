/** Pull a readable message from an axios-style error (or any Error). */
export function axiosErrorMessage(err) {
  if (!err) return "Unknown error";
  const data = err.response?.data;
  if (data && typeof data === "object" && data.message != null) {
    return String(data.message);
  }
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }
  if (err.message) return err.message;
  return "Request failed";
}
