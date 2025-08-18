
document.addEventListener("DOMContentLoaded", function() {
    const calendar = document.getElementById('single-day-calendar');
    const sidebarDays = document.getElementById('sidebar-days');
    const sidebar = document.querySelector('.calendar-sidebar');
    const savePopup = document.getElementById('save-popup');

    function getDayKey(date) {
        return date.toISOString().slice(0, 10);
    }

    function getNextDateForDay(targetDay) {
        const today = new Date();
        const currentDay = today.getDay();
        let offset = (targetDay - currentDay + 7) % 7;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + offset);
        return nextDate;
    }


    function renderDay(date) {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const dayKey = getDayKey(date);
    const savedEntries = JSON.parse(localStorage.getItem(dayKey + '-entries') || "[]");

    // Create time options for users to select; AM first, then PM
    let timeOptions = "";
    ["AM", "PM"].forEach(ampm => {
        for (let h = 1; h <= 12; h++) {
            for (let m = 0; m < 60; m += 15) {
                const hour = h < 10 ? "0" + h : h;
                const minute = m < 10 ? "0" + m : m;
                const value = `${hour}:${minute} ${ampm}`;
                timeOptions += `<option value="${value}">${value}</option>`;
            }
        }
    });

    // Renders all saved entries
    let entriesHtml = savedEntries.map((entry, idx) => `
        <div class="entry-row">
            <span class="entry-time">${entry.time}</span>
            <span class="entry-note">${entry.note}</span>
            <span class="entry-duration">${entry.duration || 30} min</span>
            <button class="delete-entry" data-idx="${idx}">Delete</button>
        </div>
    `).join('');

    calendar.innerHTML = `
        <div class="single-day-date">${date.toLocaleDateString(undefined, options)}</div>
        <div class="entry-list">${entriesHtml}</div>
        <div class="entry-form">
            <select class="single-day-time">${timeOptions}</select>
            <input type="text" class="single-day-note" placeholder="Insert task here...">
            <button class="add-entry">Add</button>
        </div>
        <button class="export-ics">Export Week to .ics</button>
    `;

    // Modal logic
    const durationModal = document.getElementById('duration-modal');
    const durationSelect = document.getElementById('duration-select');
    const confirmDurationBtn = document.getElementById('confirm-duration');
    let pendingEntry = null;

    // Add new entry (show duration modal first)
    const timeSelect = calendar.querySelector('.single-day-time');
    const noteInput = calendar.querySelector('.single-day-note');
    calendar.querySelector('.add-entry').addEventListener('click', function() {
        const time = timeSelect.value;
        const note = noteInput.value.trim();
        if (note) {
            pendingEntry = { time, note };
            durationModal.style.display = 'flex';
        }
    });

    confirmDurationBtn.onclick = function() {
        if (pendingEntry) {
            pendingEntry.duration = parseInt(durationSelect.value, 10);
            savedEntries.push(pendingEntry);
            localStorage.setItem(dayKey + '-entries', JSON.stringify(savedEntries));
            durationModal.style.display = 'none';
            pendingEntry = null;
            renderDay(date); // Re-render to show new entry
        }
    };
    // Optional: close modal if clicking outside
    durationModal.onclick = function(e) {
        if (e.target === durationModal) {
            durationModal.style.display = 'none';
            pendingEntry = null;
        }
    };

    // Delete entry
    calendar.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(btn.getAttribute('data-idx'));
            savedEntries.splice(idx, 1);
            localStorage.setItem(dayKey + '-entries', JSON.stringify(savedEntries));
            renderDay(date); // Re-render to update list
        });
    });

    // Export week to .ics
    calendar.querySelector('.export-ics').addEventListener('click', function() {
        exportWeekToICS();
    });
}

    // Show today's date by default and highlight today's sidebar
    const today = new Date();
    renderDay(today);
    const todayDayNum = today.getDay();
    sidebarDays.querySelectorAll('li').forEach(li => {
        const fullName = li.getAttribute('data-full');
        if (!li.querySelector('.full-day')) {
            const span = document.createElement('span');
            span.className = 'full-day';
            span.textContent = fullName;
            li.appendChild(span);
        }
        if (parseInt(li.getAttribute('data-day')) === todayDayNum) {
            li.classList.add('selected-day');
        }
        li.addEventListener('click', function() {
            sidebarDays.querySelectorAll('li').forEach(item => item.classList.remove('selected-day'));
            li.classList.add('selected-day');
            const targetDay = parseInt(li.getAttribute('data-day'));
            const nextDate = getNextDateForDay(targetDay);
            renderDay(nextDate);
        });
    });

    // Expand sidebar on hover
    sidebar.addEventListener('mouseenter', () => {
        sidebar.classList.add('expanded');
    });
    sidebar.addEventListener('mouseleave', () => {
        sidebar.classList.remove('expanded');
    });
});

// Export each day of the week as a separate .ics file
function exportWeekToICS() {
    const today = new Date();
    let events = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dayKey = date.toISOString().slice(0, 10);
        const entries = JSON.parse(localStorage.getItem(dayKey + '-entries') || "[]");
        const options = { weekday: 'long', month: 'short', day: 'numeric' };

        entries.forEach((entry, idx) => {
            // Convert 12-hour time to 24-hour for ICS
            let [time, ampm] = entry.time.split(' ');
            let [hour, minute] = time.split(':');
            hour = parseInt(hour, 10);
            if (ampm === "PM" && hour !== 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
            const hourStr = String(hour).padStart(2, '0');
            const dtStart = `${yyyy}${mm}${dd}T${hourStr}${minute}00`;

            // Use selected duration (default to 30 if missing)
            let duration = entry.duration || 30;
            let endHour = hour;
            let endMinute = parseInt(minute, 10) + duration;
            if (endMinute >= 60) {
                endHour += Math.floor(endMinute / 60);
                endMinute = endMinute % 60;
            }
            const endHourStr = String(endHour).padStart(2, '0');
            const endMinuteStr = String(endMinute).padStart(2, '0');
            const dtEnd = `${yyyy}${mm}${dd}T${endHourStr}${endMinuteStr}00`;

            const summary = `Notes for ${date.toLocaleDateString(undefined, options)}`;
            const description = entry.note.replace(/\n/g, '\\n');

            events +=
`BEGIN:VEVENT
UID:${dayKey}-${idx}@habitual
DTSTAMP:${dtStart}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${summary}
DESCRIPTION:${description}
END:VEVENT
`;
        });
    }

    if (events) {
        const icsContent =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Habitual App//EN
${events}END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `habitual-week.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}