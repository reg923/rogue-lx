// Firebase imports will be done inside initializeFirebase as they use URL imports

// Global Firebase and App State variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;
let watchListItems = {}; // {movieId: {title, ...}}

// State for Dark Mode - Defaults to true (Dark)
let isDarkMode = true; 

// DOM elements (assigned in DOMContentLoaded)
let navLinks = null; 
let bottomNav = null; 
let fab = null; 
let notificationModal = null;
const pages = ['intro', 'login', 'register', 'home', 'favorites', 'downloads', 'profile', 'watch'];
let currentMovie = null; 

// --- Custom Confirmation Modal Logic ---

let currentConfirmationCallback = null;

/**
 * Displays a custom confirmation modal with Yes/No buttons.
 */
function showConfirmation(title, message, callback) {
    currentConfirmationCallback = callback;
    document.getElementById('conf-title').textContent = title;
    document.getElementById('conf-message').textContent = message;
    document.getElementById('confirmation-modal').classList.remove('hidden');
}
window.showConfirmation = showConfirmation;

/**
 * Hides the custom confirmation modal.
 */
function hideConfirmation() {
    currentConfirmationCallback = null;
    document.getElementById('confirmation-modal').classList.add('hidden');
}

// Event listeners for the confirmation buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('conf-btn-yes').onclick = () => {
        if (currentConfirmationCallback) {
            currentConfirmationCallback();
        }
        hideConfirmation();
    };

    document.getElementById('conf-btn-no').onclick = () => {
        hideConfirmation();
    };
});


/**
 * Handler for the Logout button click, triggering the confirmation modal.
 */
function handleLogoutClick() {
    showConfirmation(
        "Confirm Logout",
        "Are you sure you want to log out of your account?",
        () => {
            navigateTo('intro');
            showUiMessage("You have been logged out.");
        }
    );
}
window.handleLogoutClick = handleLogoutClick;


/**
 * Utility to replace alert/confirm (now a 1-second toast)
 */
function showUiMessage(message) {
    const box = document.getElementById('ui-message-box');
    const text = document.getElementById('ui-message-text');
    
    if (box && text) {
        text.textContent = message;
        box.classList.remove('hidden');

        setTimeout(() => {
            box.classList.add('hidden');
        }, 1000); 
    }
}
window.showUiMessage = showUiMessage;

// --- Notification Modal Functions ---

/**
 * Opens the slide-up notification modal.
 */
function openNotificationModal() {
    if (notificationModal) {
        notificationModal.style.display = 'flex';
        // Wait for display change before applying transition class
        setTimeout(() => {
            notificationModal.classList.add('active');
        }, 10);
    }
}
window.openNotificationModal = openNotificationModal;

/**
 * Closes the slide-up notification modal.
 * Optionally takes an event to check if the click was on the overlay.
 */
function closeNotificationModal(event) {
    if (event && event.target.id !== 'notification-modal') {
        return; // Only close if clicking the background overlay itself
    }
    
    if (notificationModal) {
        notificationModal.classList.remove('active');
        // Wait for transition before hiding element
        setTimeout(() => {
            notificationModal.style.display = 'none';
        }, 400); 
    }
}
window.closeNotificationModal = closeNotificationModal;


/**
 * Defines and returns the movie data object (same content as movie_data.json).
 * Keeping this here for direct execution without needing a server to fetch JSON.
 */
function getMovieData() {
    return {
        'M-1': { id: 'M-1', title: 'Ballerina', year: 2024, description: 'A gripping tale of redemption and revenge in a neon-lit, futuristic Seoul. When a former bodyguard is hired to protect a pop star, she uncovers a vast conspiracy that stretches back to her own past.', videoUrl: 'https://www.youtube.com/embed/gW7S4bH639s?autoplay=1&controls=1', category: 'New Movies', image: 'https://placehold.co/200x300/10061e/8a2be2?text=BALLERINA' }, 
        'M-2': { id: 'M-2', title: 'Fantastic 4', year: 2025, description: 'Four individuals gain remarkable powers after a cosmic ray exposure and must learn to use them to defend the world from a powerful, yet familiar, threat.', videoUrl: 'https://www.youtube.com/embed/Fw9Y8_Kk26g?autoplay=1&controls=1', category: 'New Movies', image: 'https://placehold.co/200x300/10061e/8a2be2?text=FANTASTIC+4' },
        'M-3': { id: 'M-3', title: 'Wicked', year: 2024, description: 'The incredible untold story of the witches of Oz. Before Dorothy arrived, one with green skin and a fiery temper finds her true calling.', videoUrl: 'https://www.youtube.com/embed/szCjQ8_kRjM?autoplay=1&controls=1', category: 'New Movies', image: 'https://placehold.co/200x300/10061e/8a2be2?text=WICKED' },
        'M-4': { id: 'M-4', title: 'The Fall Guy', year: 2024, description: 'A former stuntman springs back into action when the star of a new movie goes missing, attempting to win back the love of his life in the process.', videoUrl: 'https://www.youtube.com/embed/j7jPnwVGdZ8?autoplay=1&controls=1', category: 'Coming Soon', image: 'https://placehold.co/200x300/10061e/8a2be2?text=THE+FALL+GUY' },
        'M-5': { id: 'M-5', title: 'Cake', year: 2023, description: 'A dark comedy about a baker who discovers her secret ingredient is the key to unimaginable wealth and unexpected danger.', videoUrl: 'https://www.youtube.com/embed/5T2F4oU3v1w?autoplay=1&controls=1', category: 'Coming Soon', image: 'https://placehold.co/200x300/10061e/8a2be2?text=Cake' },
        'M-6': { id: 'M-6', title: 'Warrior', year: 2022, description: 'A historical drama following a young samurai who must choose between his family duty and the changing world of Meiji Japan.', videoUrl: 'https://www.youtube.com/embed/lCg8xVn1eA4?autoplay=1&controls=1', category: 'Coming Soon', image: 'https://placehold.co/200x300/10061e/8a2be2?text=Warrior' },
        'M-7': { id: 'M-7', title: 'Suit', year: 2023, description: 'A financial thriller where a tailor discovers coded secrets woven into the fabric of a CEO\'s custom suit.', videoUrl: 'https://www.youtube.com/embed/k4J39xT4J9U?autoplay=1&controls=1', category: 'Coming Soon', image: 'https://placehold.co/200x300/10061e/8a2be2?text=Suit' },
        'M-8': { id: 'M-8', title: 'STARFALL', year: 2025, description: 'The final season of the epic space opera. The crew of the Phoenix makes one last desperate jump to save humanity.', videoUrl: 'https://www.youtube.com/embed/Q4A7P4sW-R4?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=STARFALL' },
        'M-9': { id: 'M-9', title: 'OMEGA 7', year: 2024, description: 'A team of genetically engineered soldiers must hunt down the rogue seventh member before he unleashes a weapon of mass destruction.', videoUrl: 'https://www.youtube.com/embed/m616i4P_y1Q?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=OMEGA+7' },
        'M-10': { id: 'M-10', title: 'NIGHT OPS', year: 2023, description: 'An elite special forces team attempts a daring midnight rescue behind enemy lines, facing impossible odds and a digital enemy.', videoUrl: 'https://www.youtube.com/embed/3RryD2H5Y2g?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=NIGHT+OPS' },
        'M-11': { id: 'M-11', title: 'THE GAME', year: 2023, description: 'In a world where life and death are decided by a high-stakes board game, a new player enters the arena seeking to challenge the master.', videoUrl: 'https://www.youtube.com/embed/WJqf0lO_U_g?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=THE+GAME' },
        'M-12': { id: 'M-12', title: 'REBIRTH', year: 2024, description: 'A thrilling sci-fi series about a corporation that promises eternal life through digital consciousness transfer, with a sinister catch.', videoUrl: 'https://www.youtube.com/embed/U3H1vA29Wf4?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=REBIRTH' },
        'M-13': { id: 'M-13', title: 'WITCH TOWN', year: 2023, description: 'A cozy mystery series set in a small town where magic is real but treated as a common nuisance by the local detective.', videoUrl: 'https://www.youtube.com/embed/1vRzNqXk70s?autoplay=1&controls=1', category: 'Trending Series', image: 'https://placehold.co/200x300/10061e/8a2be2?text=WITCH+TOWN' },
    };
}

const movieData = getMovieData();
const moviesArray = Object.values(movieData);


// --- Firebase Core Logic for Watchlist ---

/**
 * Toggles a movie's presence in the user's watchlist in Firestore.
 */
async function toggleWatchlistItem(movieId) {
    // If not authenticated or Firebase not configured, simulate locally
    if (!db || !userId || !isAuthReady) {
        const isSaved = !!watchListItems[movieId];
        if (isSaved) {
            delete watchListItems[movieId];
            showUiMessage(`Simulated: Removed ${movieData[movieId].title} from Watchlist.`);
        } else {
            watchListItems[movieId] = movieData[movieId];
            showUiMessage(`Simulated: Added ${movieData[movieId].title} to Watchlist!`);
        }
        renderHomeContent();
        renderFavoritesPage();
        if (document.getElementById('watch').classList.contains('active')) {
            renderWatchPage();
        }
        return; 
    }

    const movie = movieData[movieId];
    if (!movie) {
        showUiMessage("Error: Movie data not found.");
        return;
    }

    try {
        const docRef = db.doc(`artifacts/${appId}/users/${userId}/watchlist/${movieId}`);
        const isSaved = !!watchListItems[movieId];

        if (isSaved) {
            await deleteDoc(docRef);
            showUiMessage(`${movie.title} removed from Watchlist.`);
        } else {
            const dataToSave = { ...movie, addedAt: new Date().toISOString() };
            await setDoc(docRef, dataToSave);
            showUiMessage(`${movie.title} added to Watchlist!`);
        }
    } catch (error) {
        console.error("Error toggling watchlist item:", error);
        showUiMessage("Failed to update watchlist due to a database error.");
    }
}
window.toggleWatchlistItem = toggleWatchlistItem;


/**
 * Sets up the real-time listener for the user's watchlist.
 */
function setupWatchlistListener() {
    if (!db || !userId || !firebaseConfig) {
         console.warn("Skipping Firestore listener setup in local environment.");
         return;
    }

    if (isAuthReady) {
        loadDarkModePreference(); // Load the theme preference
    }

    const watchlistColRef = db.collection(`artifacts/${appId}/users/${userId}/watchlist`);
    const watchlistQuery = watchlistColRef.query();

    watchlistQuery.onSnapshot((snapshot) => {
        const newWatchlist = {};
        snapshot.forEach((doc) => {
            newWatchlist[doc.id] = doc.data();
        });

        watchListItems = newWatchlist;
        
        renderHomeContent();
        renderFavoritesPage();
        
        if (document.getElementById('watch')?.classList.contains('active')) {
            renderWatchPage();
        }

    }, (error) => {
        console.error("Error listening to watchlist:", error);
        showUiMessage("Failed to load watchlist data in real-time.");
    });
}


// --- Dark Mode UI and Persistence Logic ---

/**
 * Saves the current Dark Mode preference to Firestore.
 */
async function saveDarkModePreference() {
    if (!db || !userId || !isAuthReady) {
         console.warn("Cannot save dark mode preference: Firebase not ready. Simulating save.");
         return;
    }

    try {
        const settingsDocRef = db.doc(`artifacts/${appId}/users/${userId}/settings/user_preferences`);
        await settingsDocRef.set({
            isDarkMode: isDarkMode
        }, { merge: true }); 

    } catch (error) {
        console.error("Error saving dark mode preference:", error);
        showUiMessage("Failed to save preference.");
    }
}

/**
 * Loads the Dark Mode preference from Firestore.
 */
async function loadDarkModePreference() {
    if (!db || !userId || !isAuthReady) {
         return;
    }

    try {
        const settingsDocRef = db.doc(`artifacts/${appId}/users/${userId}/settings/user_preferences`);
        const docSnap = await settingsDocRef.get();

        if (docSnap.exists) {
            isDarkMode = docSnap.data().isDarkMode ?? true; 
        } else {
             isDarkMode = true;
        }
        // Apply the loaded state to the UI immediately
        applyDarkModeState(isDarkMode);

    } catch (error) {
        console.error("Error loading dark mode preference:", error);
    }
}

/**
 * Applies the dark mode state to the UI by adding/removing the 'light-mode' class.
 * @param {boolean} mode 
 */
function applyDarkModeState(mode) {
     const appContainer = document.querySelector('.app-container');
     const toggleSwitch = document.getElementById('dark-mode-toggle');
     
     if (appContainer) {
         if (mode) {
             // Dark Mode Active (Default)
             appContainer.classList.remove('light-mode');
             if (toggleSwitch) toggleSwitch.classList.add('active');
         } else {
             // Light Mode Active
             appContainer.classList.add('light-mode');
             if (toggleSwitch) toggleSwitch.classList.remove('active');
         }
     }
}

/**
 * Handles the click on the Dark Mode toggle switch.
 */
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    applyDarkModeState(isDarkMode); // Apply visual change
    saveDarkModePreference(); // Save to Firestore
    showUiMessage(isDarkMode ? "Dark Mode Activated" : "Light Mode Activated");
}
window.toggleDarkMode = toggleDarkMode;

/**
 * Renders the Profile page, specifically initializing the dark mode toggle state.
 */
function renderProfilePage() {
    applyDarkModeState(isDarkMode); 
}

// --- UI Rendering Functions ---

/**
 * Renders a single movie card HTML template.
 */
function renderMovieCard(movie) {
    const isSaved = !!watchListItems[movie.id];
    const heartClass = isSaved ? 'fa-solid saved' : 'fa-regular';

    return `
        <div class="movie-card-wrapper">
            <!-- Heart Icon for Watchlist -->
            <button class="watchlist-toggle-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleWatchlistItem('${movie.id}')">
                <i id="heart-${movie.id}" class="${heartClass} fa-heart"></i>
            </button>
            <!-- Movie Thumbnail -->
            <div class="movie-card-thumb" 
                 style="background-image: url('${movie.image}');"
                 onclick="watchMovie('${movie.id}')"
            ></div>
        </div>
    `;
}

/**
 * Renders the dynamic grids on the Home Page.
 */
function renderHomeContent() {
    const newMoviesGrid = document.getElementById('new-movies-grid');
    const comingSoonGrid = document.getElementById('coming-soon-grid');
    const trendingSeriesGrid = document.getElementById('trending-series-grid');
    
    if (!newMoviesGrid || !comingSoonGrid || !trendingSeriesGrid) return; 

    const getCards = (category) => moviesArray
        .filter(m => m.category === category)
        .map(renderMovieCard)
        .join('');

    if (newMoviesGrid) newMoviesGrid.innerHTML = getCards('New Movies');
    if (comingSoonGrid) comingSoonGrid.innerHTML = getCards('Coming Soon');
    if (trendingSeriesGrid) trendingSeriesGrid.innerHTML = getCards('Trending Series');
}

/**
 * Renders the content for the Favorites/Watchlist page.
 */
function renderFavoritesPage() {
    const favoritesArea = document.getElementById('favorites-content-area');
    if (!favoritesArea) return;

    const savedMovies = Object.values(watchListItems).sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
        const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
        return dateB - dateA;
    });

    if (savedMovies.length === 0) {
        favoritesArea.innerHTML = `
            <div class="center-message">
                <i class="fa-regular fa-heart center-icon"></i>
                <p class="text-2xl text-gray-400">No Movies in Watchlist</p>
                <p class="text-lg text-gray-500 mt-2">Find a movie on the Home tab and tap the heart icon to add it.</p>
            </div>
        `;
    } else {
        const movieCards = savedMovies.map(renderMovieCard).join('');
        favoritesArea.innerHTML = `
            <p class="text-sm text-gray-400 mb-4">You have ${savedMovies.length} movies in your Watchlist.</p>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                ${movieCards}
            </div>
        `;
    }
}


/**
 * Updates the watch page with the selected movie's details.
 */
function renderWatchPage() {
    if (!currentMovie) return;

    document.getElementById('watch-movie-title').textContent = currentMovie.title;
    document.getElementById('watch-movie-year').textContent = currentMovie.year;
    document.getElementById('watch-movie-description').textContent = currentMovie.description;

    const player = document.getElementById('video-player-iframe');
    player.src = currentMovie.videoUrl;

    const watchBtnContainer = document.getElementById('watch-watchlist-btn');
    const isSaved = !!watchListItems[currentMovie.id];
    
    if (watchBtnContainer) {
        watchBtnContainer.setAttribute('onclick', `toggleWatchlistItem('${currentMovie.id}')`);
        
        const watchIcon = watchBtnContainer.querySelector('i');
        if (watchIcon) {
            watchIcon.className = isSaved ? 'fa-solid fa-heart text-2xl' : 'fa-regular fa-heart text-2xl';
            watchIcon.style.color = isSaved ? '#ff5277' : ''; 
        }
        
        if (isSaved) {
            watchBtnContainer.classList.add('saved');
        } else {
            watchBtnContainer.classList.remove('saved');
        }
    }
}

/**
 * Stops the video playback before navigating away from the watch page.
 */
function stopVideoPlayback() {
    const player = document.getElementById('video-player-iframe');
    if (player) {
         player.src = ""; 
    }
}

/**
 * Sets the movie to watch, renders the watch page, and navigates.
 */
function watchMovie(movieId) {
    currentMovie = movieData[movieId];
    if (currentMovie) {
        renderWatchPage();
        navigateTo('watch');
    } else {
        showUiMessage(`Movie data for ID "${movieId}" not found. Cannot view details.`);
    }
}
window.watchMovie = watchMovie; 

/**
 * Navigates to a specific page ID and updates the UI accordingly.
 */
function navigateTo(pageId) {
    if (!pages.includes(pageId)) {
        console.error(`Page ID "${pageId}" not found.`);
        return;
    }

    if (document.getElementById('watch')?.classList.contains('active') && pageId !== 'watch') {
        stopVideoPlayback();
    }
    
    closeNotificationModal(); 
    hideConfirmation();

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.scrollTop = 0;
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    if (pageId === 'profile' && isAuthReady) {
        renderProfilePage();
    }

    const navPages = ['home', 'favorites', 'downloads'];
    if (bottomNav) {
        if (navPages.includes(pageId)) {
            bottomNav.classList.remove('hidden');
        } else {
            bottomNav.classList.add('hidden');
        }
    }

    if (navLinks) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageId) {
                link.classList.add('active');
            }
        });
    }

    if (pageId === 'home') {
        document.querySelector('.nav-link[data-page="home"]')?.classList.add('active');
    }

    if (fab) {
         if (pageId === 'favorites') {
            fab.classList.remove('hidden');
        } else {
            fab.classList.add('hidden');
        }
    }
   
}
window.navigateTo = navigateTo; 

// --- Initialization ---

async function initializeFirebase() {
    // Dynamically import Firebase modules from CDN URLs
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, query, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");


    if (!firebaseConfig) {
         console.warn("Firebase config is missing. Running in local fallback mode.");
         isAuthReady = true; 
         return;
    }
    
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);

        // Alias for V8 compatibility (using older syntax that is commonly supported)
        db.doc = doc;
        db.collection = collection;
        db.collection.prototype.query = query;
        db.doc.prototype.get = getDoc;
        db.doc.prototype.set = setDoc;
        db.doc.prototype.delete = deleteDoc;
        
        auth = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                setupWatchlistListener(); 
            } else {
                userId = crypto.randomUUID(); 
                isAuthReady = true;
                setupWatchlistListener();
                showUiMessage("Signed in anonymously. Watchlist is only saved temporarily.");
            }
            
            const initialPage = window.location.hash.substring(1) || 'intro';
            navigateTo(initialPage);
        });

    } catch (e) {
        console.error("Firebase initialization failed:", e);
        showUiMessage("Application failed to connect to the database. Running locally without data persistence.");
    }
}
window.initializeFirebase = initializeFirebase;


document.addEventListener('DOMContentLoaded', () => {
    navLinks = document.querySelectorAll('#bottom-nav .nav-link');
    bottomNav = document.getElementById('bottom-nav');
    fab = document.getElementById('floating-add-btn');
    notificationModal = document.getElementById('notification-modal');

    renderHomeContent();
    renderFavoritesPage();
    
    // Set initial dark mode state to dark before loading preference
    applyDarkModeState(true);
    
    initializeFirebase();

    const initialPage = window.location.hash.substring(1) || 'intro';
    navigateTo(initialPage);
});
