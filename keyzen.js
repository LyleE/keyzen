
var data = {};
data.chars = " jfkdlsahgyturieowpqbnvmcxz6758493021`-=[]\\;',./ABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|:\"<>?";
data.consecutive = 10;
data.word_length = 7;

var stats = {};
stats.history_max = 100;

stats.combo_landmarks = [25, 50, 100, 200, 300, 400, 500, 750, 1000];

$(document).ready(function() {
    if (localStorage.data != undefined) {
        load();
        render();
    }
    else {
        set_level(1);
    }
    $(document).keypress(keyHandler);

    $('#pop-up').hide();
    reset_stats();
});


function set_level(l) {
    data.in_a_row = {};
    for(var i = 0; i < data.chars.length; i++) {
        data.in_a_row[data.chars[i]] = data.consecutive;
    }
    data.in_a_row[data.chars[l]] = 0;
    data.level = l;
    data.word_index = 0;
    data.word_errors = {};
    data.word = generate_word();
    save();
    render();
}


function keyHandler(e) {
    var key = String.fromCharCode(e.which);
    var correct_key = (key == data.word[data.word_index]);
    if(correct_key) {
        data.in_a_row[key] += 1;
        (new Audio("click.wav")).play();
    }
    else {
        data.in_a_row[data.word[data.word_index]] = 0;
        data.in_a_row[key] = 0;
        (new Audio("clack.wav")).play();
        data.word_errors[data.word_index] = true;
    }
    data.word_index += 1;
    if (data.word_index >= data.word.length) {
        if(get_training_chars().length == 0) {
            level_up();
        }
        data.word = generate_word();
        data.word_index = 0;
        data.word_errors = {};
    }
    update_stats(correct_key);
    render();
    save();
}


function level_up() {
    if (data.level + 1 <= data.chars.length - 1) {
        (new Audio('ding.wav')).play();
    }
    l = Math.min(data.level + 1, data.chars.length);
    set_level(l);
}

function update_stats(latest_correct) {
    var latest = {};
    latest.correct = latest_correct;
    latest.time = $.now();
    
    stats.history_tail.next = latest;
    stats.history_tail = latest;
    if(stats.history_length == 0)
        stats.history_head = latest;
    
    if(stats.history_length < stats.history_max) { //history not full
        stats.history_length++;
        if(latest_correct)
            stats.number_correct++;
    } else { // history full
        var past_correct = stats.history_head.correct;
        
        //computes the change in accuracy
        stats.number_correct -= past_correct; //subtracts one if was correct "history_max" keys ago
        stats.number_correct += latest_correct; //adds one if was correct last key
        
        //drop the linked list head node
        stats.history_head = stats.history_head.next;
    }

    if(latest_correct)
        stats.combo++;
    else
        stats.combo = 0;
    if(stats.combo_landmarks.indexOf(stats.combo) != -1)
        pop_up('COMBO!', stats.combo + ' perfect in a row.');
}

function reset_stats() {
    stats.history_head = {};
    stats.history_tail = {};
    stats.history_length = 0;
    stats.number_correct = 0;
    stats.combo = 0;
}


function save() {
    localStorage.data = JSON.stringify(data);
}


function load() {
    data = JSON.parse(localStorage.data);
}

function pop_up(title, text) {
    var pop_up = $('#pop-up');
    pop_up.children('h2:first').html(title);
    pop_up.children('span:first').html(text);
    pop_up.slideDown('slow').delay('2000').fadeOut('slow');
}

function render() {
    render_level();
    render_word();
    render_level_bar();
    render_stats();
}


function render_level() {
    var chars = "<span id='level-chars-wrap'>";
    var level_chars = get_level_chars();
    var training_chars = get_training_chars();
    for (var c in data.chars) {
        if(training_chars.indexOf(data.chars[c]) != -1) {
            chars += "<span style='color: #F00' onclick='set_level(" + c + ");'>"
        }
        else if (level_chars.indexOf(data.chars[c]) != -1) {
            chars += "<span style='color: #000' onclick='set_level(" + c + ");'>"
        }
        else {
            chars += "<span style='color: #AAA' onclick='set_level(" + c + ");'>"
        }
        if (data.chars[c] == ' ') {
            chars += "&#9141;";
        }
        else {
            chars += data.chars[c];
        }
        chars += "</span>";
    }
    chars += "</span>";
    $("#level-chars").html(chars);
}


function render_level_bar() {
    training_chars = get_training_chars();
    if(training_chars.length == 0) {
        m = data.consecutive;
    }
    else {
        m = 1e100;
        for(c in training_chars) {
            m = Math.min(data.in_a_row[training_chars[c]], m);
        }
    }
    m = Math.floor($('#level-chars-wrap').innerWidth() * Math.min(1.0, m / data.consecutive));
    $('#next-level').css({'width': '' + m + 'px'});
    
}   

function render_word() {
    var word = "";
    for (var i = 0; i < data.word.length; i++) {
        sclass = "normalChar";
        if (i > data.word_index) {
            sclass = "normalChar";
        }
        else if (i == data.word_index) {
            sclass = "currentChar";
        }
        else if(data.word_errors[i]) {
            sclass = "errorChar";
        }
        else {
            sclass = "goodChar";
        }
        word += "<span class='" + sclass + "'>";
        if(data.word[i] == " ") {
            word += "&#9141;"
        }
        else {
            word += data.word[i];
        }
        word += "</span>";
    }
    $("#word").html("&nbsp;" + word);
}

function render_stats() {
    var stats_str = "";
    
    if(stats.history_length > 0) {
        stats_str += "Statistics (last "+ stats.history_length +" chars):";
        
        //Accuracy
        var percentage = 100 * stats.number_correct / stats.history_length;
        percentage = Math.floor(percentage*10)/10; //1 decimal place max
        stats_str += "<br \>Accuracy: " + percentage + "% (";
        stats_str += stats.number_correct + "/" + stats.history_length + " correct)";
        
        //Speed
        if(stats.history_length > 1) {
            var time_ms = stats.history_tail.time - stats.history_head.time;
            var chars_per_minute = stats.history_length / (time_ms/60000);
            chars_per_minute = Math.floor(chars_per_minute*100)/100; //2 decimal place max
            
            stats_str += "<br />Speed: " + chars_per_minute + " chars/minute";
        }
        
        stats_str += "<br /><span id='stats-reset' onclick='reset_stats();render_stats();'>[ Reset ]</span>"
    }
    
    $("#stats").html(stats_str);
}


function generate_word() {
    word = '';
    for(var i = 0; i < data.word_length; i++) {
        c = choose(get_training_chars());
        if(c != undefined && c != word[word.length-1]) {
            word += c;
        }
        else {
            word += choose(get_level_chars());
        }
    }
    return word;
}


function get_level_chars() {
    return data.chars.slice(0, data.level + 1).split('');
}

function get_training_chars() {
    var training_chars = [];
    var level_chars = get_level_chars();
    for(var x in level_chars) {
        if (data.in_a_row[level_chars[x]] < data.consecutive) {
            training_chars.push(level_chars[x]);
        }
    }
    return training_chars;
}

function choose(a) {
    return a[Math.floor(Math.random() * a.length)];
}









































