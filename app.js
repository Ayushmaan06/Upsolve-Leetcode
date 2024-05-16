const weeklyContestsContainer = document.getElementById('weekly-contests');
const biweeklyContestsContainer = document.getElementById('biweekly-contests');
const autoFetchToggle = document.getElementById('auto-fetch-toggle');
const refreshIcon = document.getElementById('refresh-icon');
const spinner = document.getElementById('spinner');
// Define constants for refresh limit and storage key for refresh count
const refreshLimit = 6;
const refreshCountKey = 'refreshCount';
const resetInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Function to reset refresh count
function resetRefreshCount() {
    localStorage.setItem(refreshCountKey, 0);
}

// Add event listener to the refresh icon
refreshIcon.addEventListener('click', () => {
    const refreshCount = parseInt(localStorage.getItem(refreshCountKey)) || 0;
    if (cookie === null || cookie === '') {
        alert('Please save your LeetCode cookie first!');
    } else {
        // Check for last reset time
        const lastResetTime = parseInt(localStorage.getItem('lastResetTime')) || 0;
        const currentTime = Date.now();

        // Reset if 6 hours have passed since last reset
        if (currentTime - lastResetTime >= resetInterval) {
            resetRefreshCount();
            localStorage.setItem('lastResetTime', currentTime);
        }

        if (refreshCount < refreshLimit) {
            localStorage.setItem(refreshCountKey, refreshCount + 1);
            fetchDataWithCookie();
        } else {
            alert('You have reached the refresh limit for today.');
        }
    }
});

// Check if Leetcode Cookie is saved in localStorage
const cookie = localStorage.getItem('leetcodeCookie');
autoFetchToggle.checked = cookie !== null ? true : false;

function toggleRefreshIcon(value) {
    if (value) {
        refreshIcon.style.display = 'block';
    } else {
        refreshIcon.style.display = 'none';
    }
}
toggleRefreshIcon(cookie !== null);

function toggleSpinner(show) {
    if (show) {
        spinner.style.display = 'block';
    } else {
        spinner.style.display = 'none';
    }
}

autoFetchToggle.addEventListener('change', function () {
    const isAutoFetch = cookie !== null ? true : false;
    document.body.classList.toggle('auto-fetch', isAutoFetch);
    if (autoFetchToggle.checked) {
        // this method is not correct! copy the cookie sent by leetcode.com, follow this: https://i.postimg.cc/C5tSpYDR/Screenshot-2024-04-21-at-6-47-35-PM.png and paste it in the prompt
        const userCookie = prompt('Please enter your LeetCode cookie:');
        if (userCookie !== null && userCookie !== '') {
            localStorage.setItem('leetcodeCookie', userCookie);
            alert('LeetCode cookie saved successfully!');
            toggleRefreshIcon(true);
        } else {
            autoFetchToggle.checked = false;
        }
    } else {
        const status = confirm('This will remove your LeetCode cookie. Are you sure you want to continue?')
        if (status) {
            localStorage.removeItem('leetcodeCookie');
            alert('LeetCode cookie removed successfully!');
            toggleRefreshIcon(false);
        } else {
            autoFetchToggle.checked = true;
        }
    }
});

// Function to fetch data using the LeetCode cookie
function fetchDataWithCookie() {
    const data = JSON.parse(localStorage.getItem('leetcodeData'));
    if (cookie) {
        toggleSpinner(true);
        fetch(`https://pritishmishra579.npkn.net/e60fbc?cookie=${cookie}`)
            .then(response => response.json())
            .then(leetcodeData => {
                const mergedData = mergeDataSets(data, leetcodeData);
                localStorage.setItem('leetcodeData', JSON.stringify(mergedData));
                renderContests(mergedData);
                toggleSpinner(false);
            })
            .catch(error => console.error('Error fetching data:', error));
    }
    renderContests(data);
}

// Check if data is stored in localStorage and is not older than 1 day
const lastUpdated = localStorage.getItem('lastUpdated');
const currentTime = new Date().getTime();
const oneDayInMs = 1000 * 60 * 60 * 24;
if (lastUpdated && currentTime - lastUpdated < oneDayInMs) {
    const data = JSON.parse(localStorage.getItem('leetcodeData'));
    renderContests(data);
} else {
    // Fetch data from the URLs
    if (cookie) {
        toggleSpinner(true);
        Promise.all([
            fetch('https://zerotrac.github.io/leetcode_problem_rating/data.json'),
            fetch(`https://pritishmishra579.npkn.net/e60fbc?cookie=${cookie}`)
        ])
            .then(responses => Promise.all(responses.map(response => response.json())))
            .then(([zerotracData, leetcodeData]) => {
                const mergedData = mergeDataSets(zerotracData, leetcodeData);
                localStorage.setItem('leetcodeData', JSON.stringify(mergedData));
                localStorage.setItem('lastUpdated', new Date().getTime());
                renderContests(mergedData);
                toggleSpinner(false);
            })
            .catch(error => console.error('Error fetching data:', error));
    } else {
        toggleSpinner(true);
        fetch('https://zerotrac.github.io/leetcode_problem_rating/data.json')
            .then(response => response.json())
            .then(data => {
                localStorage.setItem('leetcodeData', JSON.stringify(data));
                localStorage.setItem('lastUpdated', new Date().getTime());
                renderContests(data);
                toggleSpinner(false);
            })
            .catch(error => console.error('Error fetching data:', error));
    }
}

function renderContests(data) {
    // Group problems by contest
    const contestMap = new Map();
    data.forEach(problem => {
        const contestID = problem.ContestID_en;
        if (!contestMap.has(contestID)) {
            contestMap.set(contestID, []);
        }
        contestMap.get(contestID).push(problem);
    });

    // Sort contests by ContestID_en in descending order

    const sortedContests = Array.from(contestMap.entries()).sort((a, b) => {
        const aParts = a[0].match(/(\d+)/g);
        const bParts = b[0].match(/(\d+)/g);
        const aNum = aParts ? parseInt(aParts[aParts.length - 1]) : 0;
        const bNum = bParts ? parseInt(bParts[bParts.length - 1]) : 0;
        return bNum - aNum;
    });

    // Separate weekly and biweekly contests
    const weeklyContests = sortedContests.filter(([contestID]) => contestID.includes('Weekly'));
    const biweeklyContests = sortedContests.filter(([contestID]) => contestID.includes('Biweekly'));

    // Remove placeholder text
    weeklyContestsContainer.innerHTML = '';
    biweeklyContestsContainer.innerHTML = '';

    // Create dropdowns for weekly contests
    weeklyContests.forEach(([contestID, problems]) => {
        const contestDropdown = createContestDropdown(contestID, problems);
        weeklyContestsContainer.appendChild(contestDropdown);
    });

    // Create dropdowns for biweekly contests
    biweeklyContests.forEach(([contestID, problems]) => {
        const contestDropdown = createContestDropdown(contestID, problems);
        biweeklyContestsContainer.appendChild(contestDropdown);
    });
}

function createContestDropdown(contestID, problems) {
    const contestDropdown = document.createElement('details');
    contestDropdown.classList.add('contest-dropdown');
    const summary = document.createElement('summary');
    const summaryTextContainer = document.createElement('div');
    const summaryText = document.createElement('span');
    const solvedProblems = document.createElement('span');
    solvedProblems.classList.add('solved-problems');
    const solvedProblemsCount = problems.filter(problem => problem.isSolved || isChecked(problem.ContestSlug, problem.ProblemIndex)).length;
    const totalProblemsCount = problems.length;
    solvedProblems.textContent = `${solvedProblemsCount}/${totalProblemsCount}`;
    summaryText.textContent = contestID;
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('dropdown-arrow');
    summaryTextContainer.appendChild(summaryText);
    summaryTextContainer.appendChild(solvedProblems);
    summary.appendChild(summaryTextContainer);
    // summary.appendChild(summaryText);
    // summary.appendChild(solvedProblems);
    summary.appendChild(dropdownArrow);
    contestDropdown.appendChild(summary);

    // Sort problems by Rating in ascending order
    problems.sort((a, b) => a.Rating - b.Rating);

    // Create checkboxes for each problem
    problems.forEach(problem => {
        const problemCheckbox = document.createElement('div');
        problemCheckbox.classList.add('problem-checkbox');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${problem.ContestSlug}-${problem.ProblemIndex}`;
        checkbox.checked = isChecked(problem.ContestSlug, problem.ProblemIndex) || problem.isSolved;
        checkbox.addEventListener('change', () => {
            saveCheckboxState(problem.ContestSlug, problem.ProblemIndex, checkbox.checked, problems, contestDropdown);
            const solvedProblemsCount = problems.filter(problem => problem.isSolved || isChecked(problem.ContestSlug, problem.ProblemIndex)).length;
            console.log(solvedProblemsCount);
            solvedProblems.textContent = `${solvedProblemsCount}/${totalProblemsCount}`;
        });
        const problemLink = document.createElement('a');
        problemLink.href = `https://leetcode.com/problems/${problem.TitleSlug}`;
        problemLink.target = '_blank';
        problemLink.textContent = `${problem.Title}`;
        problemLink.classList.add('problem-link');
        const problemRating = document.createElement('span');
        problemRating.textContent = `(Rating: ${Math.floor(problem.Rating)})`;
        problemRating.classList.add('problem-rating');
        const label = document.createElement('label');
        label.appendChild(checkbox);
        label.appendChild(problemLink);
        label.appendChild(problemRating);
        problemCheckbox.appendChild(label);
        contestDropdown.appendChild(problemCheckbox);
        if (checkAllProblemsChecked(problems)) {
            contestDropdown.classList.add('all-checked');
        }
    });

    // Add contest link when dropdown is open
    contestDropdown.addEventListener('toggle', () => {
        if (contestDropdown.open) {
            const contestLink = document.createElement('a');
            contestLink.href = `https://leetcode.com/contest/${problems[0].ContestSlug}`;
            contestLink.target = '_blank';
            contestLink.textContent = contestID;
            summary.innerHTML = '';
            summaryTextContainer.innerHTML = '';
            summaryTextContainer.appendChild(contestLink);
            summaryTextContainer.appendChild(solvedProblems);
            summary.appendChild(summaryTextContainer);
            // summary.appendChild(contestLink);
            // summary.appendChild(solvedProblems);
            summary.appendChild(dropdownArrow);
        } else {
            summary.innerHTML = '';
            summaryTextContainer.innerHTML = '';
            summaryTextContainer.appendChild(summaryText);
            summaryTextContainer.appendChild(solvedProblems);
            summary.appendChild(summaryTextContainer);
            // summary.appendChild(summaryText);
            // summary.appendChild(solvedProblems);
            summary.appendChild(dropdownArrow);
        }
    });

    return contestDropdown;
}

function isChecked(contestSlug, problemIndex) {
    const checkedProblems = JSON.parse(localStorage.getItem('checkedProblems') || '{}');
    return checkedProblems[`${contestSlug}-${problemIndex}`] || false;
}

function saveCheckboxState(contestSlug, problemIndex, checked, problems, contestDropdown) {
    let checkedProblems = JSON.parse(localStorage.getItem('checkedProblems') || '{}');
    checkedProblems[`${contestSlug}-${problemIndex}`] = checked;
    localStorage.setItem('checkedProblems', JSON.stringify(checkedProblems));
    if (checkAllProblemsChecked(problems)) {
        contestDropdown.classList.add('all-checked');
    } else {
        contestDropdown.classList.remove('all-checked');
    }
}

function checkAllProblemsChecked(problems) {
    return problems.every(problem => isChecked(problem.ContestSlug, problem.ProblemIndex));
}

function mergeDataSets(zerotracData, leetcodeData) {
    const solvedProblems = new Set(
        leetcodeData.stat_status_pairs
            .filter(pair => pair.status === 'ac')
            .map(pair => pair.stat.question__title_slug)
    );

    return zerotracData.map(problem => {
        const isSolved = solvedProblems.has(problem.TitleSlug);
        return { ...problem, isSolved };
    });
}