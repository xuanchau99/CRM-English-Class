export const shortenAndCopyLink = async (originalLink, showToast) => {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(originalLink)}`);
    if (res.ok) {
      const shortLink = await res.text();
      await navigator.clipboard.writeText(shortLink);
      if (showToast) showToast('Đã copy link rút gọn: ' + shortLink, 'success');
      return shortLink;
    } else {
      throw new Error('TinyURL failed');
    }
  } catch (error) {
    console.error('Failed to shorten URL:', error);
    await navigator.clipboard.writeText(originalLink);
    if (showToast) showToast('Đã copy link gốc: ' + originalLink, 'success');
    return originalLink;
  }
};
