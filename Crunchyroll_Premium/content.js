const query = qry => document.body.querySelector(qry)
var preservedState = null


// Function that gets something inside the html.
function pegaString(str, first_character, last_character) {
  if(str.match(first_character + "(.*)" + last_character) == null){
      return null;
  }  else {
      new_str = str.match(first_character + "(.*)" + last_character)[1].trim()
      return new_str;
  }
}


// Function for removing elements from the page
function remove(element, name, untilRemoved = false, callback = () => {}) {
  let tries = 0;
    if (untilRemoved) {
      const finishRemove = setInterval(() => {
       if (query(element) != null) {
        clearInterval(finishRemove)
        console.log(`[quiT] Removing ${name}...`);
        const closeBtn = query(element + ' > .close-button')
         if (closeBtn) closeBtn.click()
        else query(element).style.display = 'none';
        
        callback()
      }
       else if (tries > 250) clearInterval(finishRemove)
      else tries++
    }, 20)
  } else if (query(element) != null) {
    console.log(`[quiT] Removing ${name}...`);
    query(element).style.display = 'none';
  }
}


// Function that changes the player to a simpler one.
function importPlayer(){
    var HTML = document.documentElement.innerHTML;
      console.log("[quiT - Old] Removing the old CR Player...");
    var elem = document.getElementById('showmedia_video_player');
     elem.parentNode.removeChild(elem);

      console.log("[quiT - Old] Taking the data from the stream...");
    var video_config_media = JSON.parse(pegaString(HTML, "vilos.config.media = ", ";"));

    //Remove Note from top about trying premium
    //Removes warnings that the video cannot be viewed
    //Remove suggestion to sign up for the free trial
    remove(".freetrial-note", "Free Trial Note")
    remove(".showmedia-trailer-notice", "Trailer Notice")
    remove("#showmedia_free_trial_signup", "Free Trial Signup")


    // Simulate user interaction to make it fullscreen automatically
    var element = document.getElementById("template_scroller");
     if (element) element.click();
    
    const appendTo = query("#showmedia_video_box") || query("#showmedia_video_box_wide")
    const series = document.querySelector('meta[property="og:title"]');
    const up_next = document.querySelector('link[rel=next]');

    var message = {
      'video_config_media': [JSON.stringify(video_config_media)],
      'lang': [pegaString(HTML, 'LOCALE = "', '",')],
      'series': series ? series.content : undefined,
      'up_next': up_next ? up_next.href : undefined,
    }

    console.log("[quiT - Old CR] Adding the jwplayer...");
    addPlayer(appendTo, message)
}


// Render player in the beta version
function importBetaPlayer(ready = false) {
    var videoPlayer = query('.video-player');
      if (!ready) {
        setTimeout(() => importBetaPlayer(!!videoPlayer), 100); 
      return;
    }

    console.log("[quiT - Beta] Removing CR video player...");
    remove('.video-player-placeholder', 'Video Placeholder')
    const appendTo = videoPlayer.parentNode;
    appendTo.removeChild(videoPlayer);

    console.log("[quiT - Beta] Taking data from the stream...");
    var external_lang = preservedState.localization.locale.toLowerCase()
    var ep_lang = preservedState.localization.locale.replace('-', '')
    var ep_id = preservedState.watch.id
    var ep = preservedState.content.byId[ep_id]
     if (!ep) {window.location.reload(); return;}
    var series_slug = ep.episode_metadata.series_slug_title
    var external_id = ep.external_id.substr(4)
    var old_url = `https://www.crunchyroll.com/${external_lang}/${series_slug}/episode-${external_id}`
    var up_next = document.querySelector('a.up-next-title')
    var playback = ep.playback

    var message = {
      'playback': playback,
      'old_url': old_url,
      'lang': ep_lang,
      'up_next': up_next ? up_next.href : undefined,
    }

    console.log("[quiT - Beta] Adding the jwplayer...");
    console.log("[quiT - Beta] Old URL:", old_url);
    addPlayer(appendTo, message, true)
}

function addPlayer(element, playerInfo, beta = false) {
    console.log("[quiT - Premium] Adding jwplayer...");
      var ifrm = document.createElement("iframe");
    ifrm.setAttribute("id", "frame"); 
    ifrm.setAttribute("src", "https://quiitt.github.io/Premium/"); 
    ifrm.setAttribute("width","100%");
    ifrm.setAttribute("height","100%");
    ifrm.setAttribute("frameborder","0");
    ifrm.setAttribute("scrolling","no");
    ifrm.setAttribute("allowfullscreen","allowfullscreen");
    ifrm.setAttribute("allow","autoplay; encrypted-media *");
    
    element.appendChild(ifrm)

    chrome.storage.sync.get(['aseguir', 'cooldown'], function(items) {
      ifrm.onload = function() {
        playerInfo['up_next_cooldown'] = items.cooldown === undefined ? 5 : items.cooldown;
        playerInfo['up_next_enable'] = items.aseguir === undefined ? true : items.aseguir;
        playerInfo['version'] = '1.1.0';
        playerInfo['noproxy'] = true;
        playerInfo['beta'] = beta;
        ifrm.contentWindow.postMessage(playerInfo, "*");
      };
    });
}


//Function when loading page.
function onloadfunction() {
  var HTML = document.documentElement.innerHTML;
  if(pegaString(HTML, "vilos.config.media = ", ";") != null){
    importPlayer(); // old CR
  } else if (preservedState != null){
    importBetaPlayer(); // beta CR
    remove(".erc-modal-portal > .overlay > .content-wrapper", "Free Trial Modal", true, () => document.body.classList = [])
    registerChangeEpisode();
  }
}


// Function to refresh page when changing episodes via UI beta.
var isLoaded = false

function registerChangeEpisode() {
  const epChanged = setInterval(() => {
    const videosWrapper = query('.videos-wrapper')
    if (isLoaded && !videosWrapper) {
      window.location.reload();
      clearInterval(epChanged);
    }
    isLoaded = !!videosWrapper
  }, 50)
}

document.addEventListener("DOMContentLoaded", onloadfunction, false);
document.onreadystatechange = function () {
  if (document.readyState === "interactive") {
    console.log("[CR Beta] Searching for INITIAL_STATE")
    var HTML = document.documentElement.innerHTML
    preservedState = JSON.parse(pegaString(HTML, "__INITIAL_STATE__ = ", ";"))
  }

  var crBetaStyle = document.createElement('style');
  crBetaStyle.innerHTML = `.video-player-wrapper {
    margin-top: 2rem;
    margin-bottom: calc(-3vh - 7vw);
    height: 57.25vw !important;
    max-height: 82vh !important;
  }`;
  document.head.appendChild(crBetaStyle);
}
