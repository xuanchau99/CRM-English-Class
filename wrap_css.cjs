const fs = require('fs');
let css = fs.readFileSync('./src/pages/student/ExamPlayer.css', 'utf-8');

// Replace body with .exam-player-wrapper
css = css.replace(/^body\s*\{/gm, '.exam-player-wrapper {');
css = css.replace(/^header\s*\{/gm, '.exam-player-wrapper header {');
css = css.replace(/^main\s*\{/gm, '.exam-player-wrapper main {');
css = css.replace(/^h2,\s*h3,\s*h4\s*\{/gm, '.exam-player-wrapper h2, .exam-player-wrapper h3, .exam-player-wrapper h4 {');
css = css.replace(/^h2\s*\{/gm, '.exam-player-wrapper h2 {');
css = css.replace(/^h3\s*\{/gm, '.exam-player-wrapper h3 {');

// Write back
fs.writeFileSync('./src/pages/student/ExamPlayer.css', css);
console.log('Done!');
