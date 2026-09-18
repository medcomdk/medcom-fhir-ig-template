
function calculateSearchScore(results, query) {
    let score = 0;

    const lowerQuery = query.toLowerCase();

    if (results.title.toLowerCase().includes(lowerQuery)) {
        score += 100;
    }

    if (results.path.toLowerCase().includes(lowerQuery)) {
        score += 40;
    }

    if (results.text.toLowerCase().includes(lowerQuery)) {
        score += 10;
    }
    return score;
}