//
//
//     nop.js
//     http://nopjs.org
//     (c) 2015 Daniele Liberti
//     nop may be freely distributed under the MIT license.
//     
//     
//     
//     The MIT License (MIT)
//
//     Copyright (c) 2015 Daniele Liberti, nop.js
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy of
//     this software and associated documentation files (the "Software"), to deal in
//     the Software without restriction, including without limitation the rights to
//     use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
//     the Software, and to permit persons to whom the Software is furnished to do so,
//     subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
//     copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
//     FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
//     COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
//     IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
//     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


(function(root, factory) {

    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.nop = factory();
    }

}(this, function() {

    "use strict";

    var nop, n, tagPrefix = "nop";

    //
    //
    // **NOP EVENT PROVIDER DEFINITION**
    //
    //
    var nopEventProvider = function() {

        this._nopatchers = {};
        this._nopatchersAll = {};

    };

    nopEventProvider.prototype.constructor = nopEventProvider;

    nopEventProvider.prototype.watchAll = function(handler) {

        this._nopatchersAll = this._nopatchersAll || [];
        if (!_nop.contains(this._nopatchersAll, handler)) {
            this._nopatchersAll.push(handler);
        }

    }

    nopEventProvider.prototype.watch = function(selector, handler) {

        if (!this._nopatchers) {
            this._nopatchers = {};
        }
        this._nopatchers[selector] = this._nopatchers[selector] || [];
        this._nopatchers[selector].push(handler);

    }

    nopEventProvider.prototype.findWatcherDeps = function(selector) {

        var result = [];
        var watchers = _nop.keys(this._nopatchers);
        watchers.forEach(function(watcher) {
            if (startsWith(selector, watcher)) {
                result.push(watcher);
            }
        });
        return result;

    }

    nopEventProvider.prototype.emitChange = function(selector /* , arguments */ ) {

        if (!this._nopatchers) {
            this._nopatchers = {};
        }

        var self = this;

        var deps = self.findWatcherDeps(selector);
        deps.forEach(function(item) {
            if (self._nopatchers[item]) {
                self._nopatchers[item].forEach(function(handler) {
                    handler.apply(self, [self.get(item)]);
                });
            }
        });

        if (!self._nopatchersAll || !_nop.isArray(self._nopatchersAll)) {
            return;
        }
        self._nopatchersAll.forEach(function(watcher) {
            if (_nop.isFunction(watcher)) {
                watcher.apply(self, [selector, self.get(selector)]);
            }
        });

    }

    //
    //
    // **NOP DEFINITION** 
    // 
    // 
    var NOP = function() {

        this.data = {};
        this._bindings = {};
        this.options = {
            persistent: true,
            timeoutInput: 50,
            timeoutDOM: 500
        };

        this.v = "0.4.1";

    };

    NOP.prototype = Object.create(nopEventProvider.prototype);
    NOP.constructor = NOP;

    //
    //
    // **DOM METHODS CHAINING**
    // 
    // 
    NOP.prototype.dom = function(element) {

        this._element = n.dom(element).get(0);
        return this;

    };

    //
    //
    // **DOM METHODS: DOM -> JSON**
    //
    //
    NOP.prototype.toStorage = function(options, element) {

        var self = this,
            element = element || self._element,
            options = options || self.dom(element).getOptions(),
            data = self.dom(element).toJSON(options),
            scope = self.dom(element).scope(),
            selector = scope ? scope + "." + options.data : options.data;

        if (options.readonly) {
            return false;
        }
        self.set(selector, data, options);

    }

    NOP.prototype.toJSON = function(options, element) {

        var self = this,
            element = element || self._element,
            data = self.dom(element).getValue(),
            options = options || self.dom(element).getOptions();

        if (_nop.isArray(options.pick)) {
            data = selectNested(data, options.pick, true);
        }
        if (_nop.isArray(options.omit)) {
            data = selectNested(data, options.omit, false);
        }

        return data;

    }

    //
    //
    // **DOM METHODS: JSON -> DOM**
    //
    //
    NOP.prototype.fromStorage = function(options, element) {
        var self = this,
            element = element || self._element,
            options = options || self.dom(element).getOptions();

        if (options.writeonly) {
            return false;
        }

        var scope = self.dom(element).scope(),
            selector = scope ? scope + "." + options.data : options.data,
            data = self.get(selector);
        self.dom(element).fromJSON(data, options);

        //
        //
        //EXPRESSION REPLACE
        //
        //

        for (var i in options) {
            var optionsName = i;
            var optionsValue = options[i];

            var re = new RegExp("{{+.+}}", "g");
            var reOBJ = re.exec(optionsValue);

            if (reOBJ != null) {
                re = /{{+.+}}/g;
                var reOBJ = optionsValue.match(re)[0];
                var reOBJ = reOBJ.substr(2, reOBJ.length - 4);
                var optionsValue = optionsValue.replace(re, eval(reOBJ));
                n.dom(element).attr(optionsName, optionsValue);
            }
        }
    }

    NOP.prototype.fromJSON = function(data, options, element) {

        var self = this,
            element = element || self._element,
            options = options || self.dom(element).getOptions();

        if (options.writeonly) {
            return false;
        }

        if (_nop.isObject(data)) {
            if (_nop.isArray(options.pick)) {
                data = selectNested(data, options.pick, true);
            }
            if (_nop.isArray(options.omit)) {
                data = selectNested(data, options.omit, false);
            }
            var currentData = _nop.isObject(self.dom(element).toJSON()) ? self.dom(element).toJSON() : {};
            data = _nop.extend(currentData, data);
        }

        if (options.json) {
            data = _json.isStringified(data) ? data : _json.prettyprint(data);
        }

        self.dom(element).setValue(data, options);

    }

    //
    //
    // **DOM METHODS: GET - SET HTML**
    //
    //
    NOP.prototype.getValue = function(element) {
        var self = this,
            element = element || self._element;

        var getters = {
            "SELECT": function() {
                return n.dom(element).val();
            },
            "INPUT": function() {
                var type = n.dom(element).type();
                if (_nop.contains(["text", "password"], type)) {
                    return n.dom(element).val();
                }
                if (_nop.contains(["checkbox", "radio"], type)) {
                    return n.dom(element).prop("checked") ? n.dom(element).val() : null;
                }

            },
            "TEXTAREA": function() {
                return n.dom(element).val();
            }
        }
        var defaultGetter = function(a) {
            return n.dom(element).html();
        }

        var elementType = n.dom(element).get(0).tagName;
        var getter = getters[elementType] || defaultGetter;
        return getter();

    }

    NOP.prototype._patterns = {
        uppercase: function(data) {
            return _nop.isString(data) ? data.toUpperCase() : data;
        },
        lowercase: function(data) {
            return _nop.isString(data) ? data.toLowerCase() : data;
        },
        reverse: function(data) {
            return data && data.split && _nop.isFunction(data.split) ? data.split("").reverse().join("") : data;
        }
    };

    NOP.prototype.registerPattern = function(name, pattern) {
        var self = this;
        if (_nop.isFunction(pattern)) {
            self._patterns[name] = pattern;
        }
    }

    NOP.prototype.setValue = function(data, options, element) {
        var self = this,
            element = element || self._element,
            options = options || self.dom(element).getOptions();

        options.pattern = options.pattern || [];
        options.pattern.forEach(function(patternName) {
            var pattern = self._patterns[patternName] || function(data) {
                return data
            };
            data = pattern(data);
        });


        var setters = {

            "SELECT": function(a) {
                n.dom(element).val(a);
            },
            "INPUT": function(a) {
                if (!_nop.isString(a)) {
                    a = JSON.stringify(a);
                }
                var type = n.dom(element).get(0).type;
                if (_nop.contains(["text", "password"], type)) {
                    n.dom(element).val(a || "");
                }
                if (_nop.contains(["checkbox", "radio"], type)) {
                    if (a === n.dom(element).val()) {
                        n.dom(element).prop("checked", true);
                    } else {
                        n.dom(element).prop("checked", false);
                    }
                }
            },
            "TEXTAREA": function(a) {
                if (!_nop.isString(a)) {
                    a = JSON.stringify(a);
                }
                n.dom(element).val(a || "");
            },
            "PRE": function(a) {
                if (options.html) {
                    n.dom(element).html(a);
                } else {
                    n.dom(element).text(a);
                }
            },
            "IMG": function(a) {

                if (!a) {
                    a = options.default || "";
                    n.dom(element).attr("src", a);
                    return false;
                }

                var isValidImageUrl = function(url, cb) {
                    n.dom(element).addClass("nop-loading");
                    n.dom("img", {
                        src: url,
                        onerror: function() {
                            cb(false);
                        },
                        onload: function() {
                            cb(true);
                        }
                    });
                }

                isValidImageUrl(a, function(response) {
                    n.dom(element).removeClass("nop-loading");
                    if (response) {
                        n.dom(element).removeClass("nop-error").addClass("nop-success");
                    } else {
                        if (a) {
                            n.dom(element).addClass("nop-error");
                        } else {
                            n.dom(element).removeClass("nop-error").removeClass("nop-success");
                        }
                        a = options.default || "";
                    }
                    n.dom(element).attr("src", a);
                });

            }

        }

        var defaultSetter = function(a) {
            if (options.html) {
                n.dom(element).html(a, options);
            } else {
                n.dom(element).text(a, options);
            }

        }

        var elementType = n.dom(element).get(0).tagName;
        var setter = setters[elementType] || defaultSetter;
        setter(data);

    }

    NOP.prototype.setDefault = function(force, options, element) {

        var self = this,
            element = element || self._element,
            force = force || false,
            options = options ? _nop.extend(self.dom(element).getOptions(), options) : self.dom(element).getOptions();
        if (!options.default) {
            return false;
        }
        if (force) {
            self.set(options.data, options.default, options);
        } else {
            self.dom(element).setValue(options.default, options);
        }
    }

    NOP.prototype.setDefaults = function() {

        var self = this,
            dataSelector = "[" + tagPrefix + "-default]";

        var elements = n.dom(dataSelector).get();
        for (var i in elements) {
            var element = elements[i],
                options = self.dom(element).getOptions(),
                selector = options.data || null,
                data = selector ? self.get(selector) : null;
            if (!data) {
                self.dom(element).setDefault();
            }
        }

    }

    //
    //
    // **DOM METHODS: GET - SET BINDINGS**
    //
    //
    NOP.prototype.registerBindings = function() {
        var self = this;

        //
        //
        // NOP-DATA
        //
        //
        var selector = "[" + tagPrefix + "-data]";
        self._bindings = {};
        var elements = n.dom(selector).get();

        for (var i in elements) {
            var element = elements[i],
                options = self.dom(element).getOptions(),
                scope = self.dom(element).scope(),
                selector = scope ? scope + "." + options.data : options.data;

            self._bindings[selector] = self._bindings[selector] || [];

            if (!_nop.contains(self._bindings[selector], n.dom(element).get(0))) {
                self._bindings[selector].push(n.dom(element).get(0));
            }
        }

        //
        //
        // NOP-BIND
        //
        //
        var selector = "[" + tagPrefix + "-bind]";
        var elements = n.dom(selector).get();

        for (var i in elements) {
            var element = elements[i];

            options = self.dom(element).getOptions(),
                scope = self.dom(element).scope(),
                selector = scope ? scope + "." + options.bind : options.bind;

            self._bindings[selector] = self._bindings[selector] || [];

            if (!_nop.contains(self._bindings[selector], n.dom(element).get(0))) {
                self._bindings[selector].push(n.dom(element).get(0));
            }
        }

        //
        //
        // NOP-IF
        //
        //
        var selector = "[" + tagPrefix + "-if]";
        var elements = n.dom(selector).get();

        for (var i in elements) {
            var element = elements[i];

            options = self.dom(element).getOptions(),
                scope = self.dom(element).scope(),
                selector = scope ? scope + "." + options.bind : options.bind;

            self._bindings[selector] = self._bindings[selector] || [];

            if (!_nop.contains(self._bindings[selector], n.dom(element).get(0))) {
                self._bindings[selector].push(n.dom(element).get(0));
            }
        }

    }

    NOP.prototype.updateBindings = function(selector) {

        var self = this;
        self._bindings = self._bindings || {};

        // Set bindings for the data selector
        var bindings = pickAndMergeParentArrays(self._bindings, selector);
        bindings.forEach(function(element) {
            var focused = (n.dom(element).get(0) === n.dom(":focus").get(0)) ? true : false;
            if (!focused) {
                self.dom(element).fromStorage();
            }
        });

        if (self._bindings["__all__"]) {
            self._bindings["__all__"].forEach(function(element) {
                self.dom(element).fromJSON(self.data);
            });
        }

    }

    //
    //
    // **DOM METHODS: GET - SET REPEATS**
    //
    //

    NOP.prototype.registerRepeats = function() {

        // Register repeats
        var self = this;
        var selector = "[" + tagPrefix + "-repeat]";
        self._repeats = self._repeats || {};
        self._repeatsCount = self._repeatsCount || 0;

        var elements = n.dom(selector).get();
        for (var i in elements) {
            var element = elements[i],
                options = self.dom(element).getOptions();

            self._repeats[options.repeat] = self._repeats[options.repeat] || [];

            var wrapperAttr = tagPrefix + "-repeat-wrapper=\"" + self._repeatsCount + "\"",
                parent = n.dom(element).parent("[" + wrapperAttr + "]");
            if (!parent.length) {
                self._repeats[options.repeat].push({
                    id: self._repeatsCount,
                    element: n.dom(element).clone(true).removeAttr(tagPrefix + "-repeat").removeAttr(tagPrefix + "-filter").get(0),
                    selector: options.repeat,
                    filter: options.filter
                });
                n.dom(n.dom(element).parent()).attr(tagPrefix + "-repeat-wrapper", self._repeatsCount);
                n.dom(n.dom(element).parent()).attr(tagPrefix + "-scope", options.repeat);
                if (options.filter) {
                    n.dom(n.dom(element).parent()).attr(tagPrefix + "-filter", options.filter);
                }

                self.updateRepeats(options.repeat);

                self._repeatsCount++;

            }

        }

    }

    NOP.prototype.updateRepeats = function(selector) {

        var self = this;
        self._repeats = self._repeats || {};

        var repeats = pickAndMergeParentArrays(self._repeats, selector);

        repeats.forEach(function(repeat) {

            var wrapper = "[" + tagPrefix + "-repeat-wrapper=\"" + repeat.id + "\"]",
                data = self.get(repeat.selector),
                items = [];

            repeat.filter = repeat.filter || [];
            n.dom(wrapper).empty();

            for (var key in data) {


                n.dom(repeat.element).attr(tagPrefix + "-scope", key);
                var html = n.dom(repeat.element).get(0).outerHTML;
                var m = html.match(/\$\$(key|{[^\}]+})/gi);
                html = html.replace(m, eval(RegExp.$1));
                items.push(html);

            }

            n.dom(wrapper).html(items.join(""));
            setEventListeners(wrapper);
            self.registerBindings();
            self.updateBindings();

        });

    }

    //
    //    
    // **DOM METHODS: FORMS**
    // 
    // 
    NOP.prototype.updateForms = function() {

        var self = this;
        var selector = "form[" + tagPrefix + "-data]";

        var elements = n.dom(selector).get();
        for (var i in elements) {

            var form = elements[i],
                options = self.dom(form).getOptions(),
                formDataSelector = options.data;
            n.dom(form).removeAttr(tagPrefix + "-data");

            var inputs = n.dom(form).find("[name]").reverse().get();
            for (var i in inputs) {

                var input = inputs[i],
                    name = n.dom(input).attr("name");

                if (endsWith(name, "[]")) {
                    var array = name.split("[]")[0],
                        arraySelector = "[name^='" + array + "']",
                        arrayIndex = n.dom(form).find(arraySelector).get().length;
                    name = array + "." + arrayIndex;
                }
                var selector = formDataSelector + "." + name;
                options.data = selector;
                self.dom(input).setOptions(options);
                n.dom(input).removeAttr("name");
            }
        }


        //
        //
        //UPDATE NOP-IF
        //
        //
        var selector = "[" + tagPrefix + "-if]";

        var elements = n.dom(selector).get();
        for (var i in elements) {
            var element = elements[i];
            if (element.getAttribute("if") == "undefined" || element.getAttribute("if") == "false") {
                n.dom(element).attr("hidden", "true");
            } else {
                n.dom(element).removeAttr("hidden");
            }
        }
    }

    //
    //
    // **DOM METHODS: GET - SET ALL DEPENDENCIES**
    //
    //
    NOP.prototype.registerDependencies = function() {

        this.registerBindings();
        this.registerRepeats();

    }

    NOP.prototype.updateDependencies = function(selector) {

        this.updateBindings(selector);
        this.updateRepeats(selector);
        this.updateForms(selector);

    }

    //
    //
    // **DOM METHODS: OPTIONS PARSING**
    //
    //
    NOP.prototype.setOptions = function(options, element) {

        var self = this,
            element = self._element || element;

        for (var k in options) {
            var attr = tagPrefix + "-" + k,
                value = options[k];
            n.dom(element).attr(attr, value);
        }
    }

    NOP.prototype.getOptions = function(element) {

        var self = this,
            element = element || self._element,
            defaultOptions = {
                data: null,
                html: false,
                readonly: false,
                writeonly: false,
                persistent: false
            };
        return _nop.extend(defaultOptions, self.dom(element).getAttrs(tagPrefix));

    }

    NOP.prototype.getAttrs = function(prefix, element) {

        var self = this,
            element = element || self._element;

        var parseAttrValue = function(key, value) {

            var attrTypes = {
                pick: "array",
                omit: "array",
                readonly: "boolean",
                writeonly: "boolean",
                json: "boolean",
                html: "boolean",
                persistent: "boolean"
            };

            var parsers = {
                array: function(value) {
                    return value.split(",");
                },
                boolean: function(value) {
                    if (value === "true") {
                        return true;
                    }
                    if (value === "false") {
                        return false;
                    }
                    return true;
                }
            };
            var defaultParser = function() {
                return value;
            };
            var valueType = attrTypes[key] || null;
            var parser = parsers[valueType] || defaultParser;

            return parser(value);

        }

        var attributes = {};
        var attrs = [].slice.call(n.dom(element).get(0).attributes);
        attrs.forEach(function(attr) {

            var include = (prefix && startsWith(attr.name, prefix + "-")) ? true : false;

            if (include) {
                var name = (prefix) ? attr.name.slice(prefix.length + 1, attr.name.length) : attr.name;
                var value = parseAttrValue(name, attr.value);
                if (_nop.contains(["pattern", "filter"], name)) {
                    value = value.split("|");
                }
                attributes[name] = value;
            }

            //
            //
            //EXPRESSION {{}} IN STANDARD ATTRIBUTES NAMES
            //
            //
            var re = new RegExp("{{+.+}}", "g");
            var reOBJ = (re.exec(attr.value)) ? true : false;

            if (reOBJ && !include) {
                var name = attr.name;
                var value = parseAttrValue(name, attr.value);
                n.dom(element).attr(prefix + "-" + name, value);
                if (_nop.contains(["pattern", "filter"], name)) {
                    value = value.split("|");
                }
                attributes[name] = value;
            }

        });

        return attributes;

    }

    //
    //
    // **DOM METHODS: SCOPING**
    //
    //
    NOP.prototype.scope = function(options, element) {

        var self = this,
            element = element || self._element,
            scopeAttr = tagPrefix + "-scope",
            scopeBreakAttr = tagPrefix + "-scope-break",
            scopes = [],
            scope = "";

        var parentsSelector = "[" + scopeBreakAttr + "], [" + scopeAttr + "]";
        var elements = n.dom(element).parents(parentsSelector).get();
        for (var i in elements) {
            var el = elements[i];

            if (n.dom(el).attr(scopeBreakAttr)) {
                break;
            }
            var attr = n.dom(el).attr(scopeAttr);
            scopes.unshift(attr);
        }
        if (n.dom(element).attr(scopeAttr)) {
            scopes.push(n.dom(element).attr(scopeAttr));
        }
        if (n.dom(element).attr(scopeBreakAttr)) {
            scopes = [];
        }

        scope = _nop.compact(scopes).join(".");
        return scope;

    }

    NOP.prototype.get = function(selector) {

        var self = this;
        if (selector !== undefined && !_nop.isString(selector)) {
            return false;
        }
        if (!self.data) {
            return {};
        }
        return selector ? _json.get(self.data, selector) : self.data;

    }

    NOP.prototype.set = function(selector, value, options) {
        if (!selector) {
            return false;
        }
        if (selector.split(".")[0] === "this") {
            console.log("Sorry, \"this\" is a reserved word in nop.js");
            return false;
        }

        var self = this;
        options = options || {};

        if (selector) {

            if (!_nop.isString(selector)) {
                return false;
            }
            self.data = self.data || {};
            self.data = selector ? _json.set(self.data, selector, value) : {};

            self.updateDependencies(selector);
            self.emitChange(selector, value);
            if (options.persistent) {
                self.backup(selector);
            }
        }
    }

    NOP.prototype.jsonSortBy = function(json, by, reverse, primer) {
        var key = primer ? function(x) {
            return primer(x[by])
        } : function(x) {
            return x[by]
        };
        reverse = !reverse ? 1 : -1;
        return json.sort(
            function(a, b) {
                return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
            })
    }

    NOP.prototype.push = function(selector, value, options) {

        if (!selector) {
            return false;
        }

        var self = this;
        options = options || {};

        if (selector) {
            self.data = selector ? _json.push(self.data, selector, value, true) : {};
        }

        self.updateDependencies(selector);
        self.emitChange(selector, null);
        if (options.persistent) {
            self.backup(selector);
        }

    }

    NOP.prototype.remove = function(selector, options) {

        var self = this;
        options = options || {};

        if (selector) {
            self.data = _json.remove(self.data, selector);
        } else {
            self.data = {};
        }

        self.updateDependencies(selector);
        self.emitChange(selector, null);
        if (options.persistent) {
            self.backup(selector);
        }

    }

    NOP.prototype.clear = function() {

        this.remove(null, {
            persistent: true
        });

    }

    //
    //
    // **JSON CREATE GROUP**
    // Allows to group items of a json object given a key.
    // 
    //
    NOP.prototype.jsonGroup = function(json, groupBy) {
        var groups = {};
        for (var i = 0; i < json.length; i++) {
            var item = json[i];
            if (!groups[item[groupBy]]) {
                groups[item[groupBy]] = [];
            }
            groups[item[groupBy]].push(item)
        }
        var result = [];
        for (var x in groups) {
            if (groups.hasOwnProperty(x)) {
                var obj = {};
                obj[x] = groups[x];
                result.push(obj);
            }
        }

        return result;
    }

    //
    //
    // **LOCALSTORAGE METHODS**
    // 
    // 
    NOP.prototype.backup = function() {

        var self = this;
        if (!self.options.persistent) {
            return;
        }
        try {
            var data = self.data || {};
            localStorage.setItem(tagPrefix, JSON.stringify(data));
        } catch (e) {
            console.log("Your browser does not support localStorage.");
        }

    }

    NOP.prototype.restore = function() {

        var self = this;
        if (!self.options.persistent) {
            return;
        }
        try {
            var data = localStorage.getItem(tagPrefix);
            try {
                data = JSON.parse(data);
                for (var key in data) {
                    self.set(key, data[key]);
                }
            } catch (e) {}
        } catch (e) {
            console.log("Your browser does not support localStorage.");
        }

    }


    //
    //
    // **ROUTER**
    // 
    // 
    NOP.prototype.router = {
        routes: [],
        mode: null,
        root: '/',
        config: function(options) {
            this.mode = options && options.mode && options.mode == 'history' && !!(history.pushState) ? 'history' : 'hash';
            this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
            return this;
        },
        getFragment: function() {
            var fragment = '';
            if (this.mode === 'history') {
                fragment = this.clearSlashes(decodeURI(location.pathname + location.search));
                fragment = fragment.replace(/\?(.*)$/, '');
                fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
            } else {
                var match = window.location.href.match(/#(.*)$/);
                fragment = match ? match[1] : '';
            }
            return this.clearSlashes(fragment);
        },
        clearSlashes: function(path) {
            return path.toString().replace(/\/$/, '').replace(/^\//, '');
        },
        add: function(re, handler) {
            if (typeof re == 'function') {
                handler = re;
                re = '';
            }
            this.routes.push({
                re: re,
                handler: handler
            });
            return this;
        },
        remove: function(param) {
            for (var i = 0, r; i < this.routes.length, r = this.routes[i]; i++) {
                if (r.handler === param || r.re.toString() === param.toString()) {
                    this.routes.splice(i, 1);
                    return this;
                }
            }
            return this;
        },
        flush: function() {
            this.routes = [];
            this.mode = null;
            this.root = '/';
            return this;
        },
        check: function(f) {
            var fragment = f || this.getFragment();
            for (var i = 0; i < this.routes.length; i++) {
                var match = fragment.match(this.routes[i].re);
                if (match) {
                    match.shift();
                    this.routes[i].handler.apply({}, match);
                    return this;
                }
            }
            return this;
        },
        listen: function() {
            var self = this;
            var current = self.getFragment();
            var fn = function() {
                if (current !== self.getFragment()) {
                    current = self.getFragment();
                    self.check(current);
                }
            }
            clearInterval(this.interval);
            this.interval = setInterval(fn, 50);
            return this;
        },
        navigate: function(path) {
            path = path ? path : '';
            if (this.mode === 'history') {
                history.pushState(null, null, this.root + this.clearSlashes(path));
            } else {
                window.location.href.match(/#(.*)$/);
                window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path;
            }
            return this;
        }
    }

    //
    //
    // **AJAX**
    // 
    // 
    NOP.prototype.ajax = {
        request: function(ops) {

            if (typeof ops == 'string') ops = {
                url: ops
            };
            ops.url = ops.url || '';
            ops.method = ops.method || 'get'
            ops.data = ops.data || {};

            var getParams = function(data, url) {
                var arr = [],
                    str;
                for (var name in data) {
                    arr.push(name + '=' + encodeURIComponent(data[name]));
                }
                str = arr.join('&');
                if (str != '') {
                    return url ? (url.indexOf('?') < 0 ? '?' + str : '&' + str) : str;
                }
                return '';
            }

            var api = {
                host: this.host || {},
                process: function(ops) {
                    var self = this;
                    this.xhr = null;
                    if (window.ActiveXObject) {
                        this.xhr = new ActiveXObject('Microsoft.XMLHTTP');
                    } else if (window.XMLHttpRequest) {
                        this.xhr = new XMLHttpRequest();
                    }
                    if (this.xhr) {
                        this.xhr.onreadystatechange = function() {
                            if (self.xhr.readyState == 4 && self.xhr.status == 200) {
                                var result = self.xhr.responseText;
                                if (ops.json === true && typeof JSON != 'undefined') {
                                    result = JSON.parse(result);
                                }
                                self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
                            } else if (self.xhr.readyState == 4) {
                                self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
                            }
                            self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
                        }

                        if (ops.method == 'get') {
                            this.xhr.open("GET", ops.url + getParams(ops.data, ops.url), true);
                        } else {
                            this.xhr.open(ops.method, ops.url, true);
                            this.setHeaders({
                                'X-Requested-With': 'XMLHttpRequest',
                                'Content-type': 'application/x-www-form-urlencoded'
                            });
                        }
                        if (ops.headers && typeof ops.headers == 'object') {
                            this.setHeaders(ops.headers);
                        }
                        setTimeout(function() {
                            ops.method == 'get' ? self.xhr.send() : self.xhr.send(getParams(ops.data));
                        }, 20);
                    }
                    return this;
                },
                done: function(callback) {
                    this.doneCallback = callback;
                    return this;
                },
                fail: function(callback) {
                    this.failCallback = callback;
                    return this;
                },
                always: function(callback) {
                    this.alwaysCallback = callback;
                    return this;
                },
                setHeaders: function(headers) {
                    for (var name in headers) {
                        this.xhr && this.xhr.setRequestHeader(name, headers[name]);
                    }
                }
            }
            return api.process(ops);
        }
    }


    //
    //
    // **MISC**
    //
    //
    var matchesSelector = function(el, selector) {
        var matchers = ["matches", "matchesSelector", "webkitMatchesSelector", "mozMatchesSelector", "msMatchesSelector", "oMatchesSelector"],
            fn = null;
        for (var i in matchers) {
            fn = matchers[i];
            if (_nop.isFunction(el[fn])) {
                return el[fn](selector);
            }
        }
        return false;
    }

    var startsWith = function(str, starts) {

        if (starts === "") {
            return true;
        }
        if (str === null || starts === null) {
            return false;
        }
        str = String(str);
        starts = String(starts);
        return str.length >= starts.length && str.slice(0, starts.length) === starts;

    }

    var endsWith = function(str, ends) {

        if (ends === "") {
            return true;
        }
        if (str === null || ends === null) {
            return false;
        }
        str = String(str);
        ends = String(ends);
        return str.length >= ends.length && str.slice(str.length - ends.length, str.length) === ends;

    }

    var cleanEmptyKeys = function(object) {

        return _nop.pick(object, _nop.compact(_nop.keys(object)));

    }

    var filterStartingWith = function(object, string, type) { // true: pick - false: omit

        var keys = _nop.keys(object);
        keys.forEach(function(key) {
            if (type) {
                if (!startsWith(key, string)) {
                    delete object[key];
                }
            } else {
                if (startsWith(key, string)) {
                    delete object[key];
                }
            }
        });
        return object;

    }

    var selectNested = function(data, keys, type) {

        var flat = _json.flatten(data);
        for (var i in keys) flat = filterStartingWith(flat, keys[i], type);
        var unflat = _json.unflatten(flat);
        return cleanEmptyKeys(unflat);

    }

    var pickAndMergeParentArrays = function(object, selector) {

        var keys = [];
        if (selector) {

            var split = selector.split("."),
                lastKey = split[split.length - 1],
                isArrayItem = !isNaN(lastKey);

            if (isArrayItem) {
                split.pop();
                var key = split.join(".");
                keys = object[key] ? _nop.union(keys, object[key]) : keys;
            }

            for (var key in object) {
                if (startsWith(key, selector)) {
                    keys = _nop.union(keys, object[key]);
                }
            }

        } else {

            for (var key in object) {
                keys = _nop.union(keys, object[key]);
            }

        }
        return keys;

    }

    var isPrintableKey = function(e) {

        var keycode = e.keyCode;
        if (!keycode) {
            return true;
        }

        var valid =
            (keycode === 8) || // delete
            (keycode > 47 && keycode < 58) || // number keys
            keycode === 32 || keycode === 13 || // spacebar & return key(s) (if you want to allow carriage returns)
            (keycode > 64 && keycode < 91) || // letter keys
            (keycode > 95 && keycode < 112) || // numpad keys
            (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
            (keycode > 218 && keycode < 223); // [\]' (in order)

        return valid;

    }

    var escapeHTML = function(str) {
        return str && _nop.isString(str) ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : str;
    }

    //
    //
    // **_nop (strip of the required underscore methods)**
    // 
    //
    var _nop = {};

    var ArrayProto = Array.prototype,
        ObjProto = Object.prototype,
        FuncProto = Function.prototype;

    var nativeIsArray = Array.isArray,
        nativeKeys = Object.keys,
        nativeBind = FuncProto.bind;

    var
        push = ArrayProto.push,
        slice = ArrayProto.slice,
        concat = ArrayProto.concat,
        toString = ObjProto.toString,
        hasOwnProperty = ObjProto.hasOwnProperty;

    var flatten = function(input, shallow, strict, output) {
        if (shallow && _nop.every(input, _nop.isArray)) {
            return concat.apply(output, input);
        }
        for (var i = 0, length = input.length; i < length; i++) {
            var value = input[i];
            if (!_nop.isArray(value) && !_nop.isArguments(value)) {
                if (!strict) output.push(value);
            } else if (shallow) {
                push.apply(output, value);
            } else {
                flatten(value, shallow, strict, output);
            }
        }
        return output;
    };

    var createCallback = function(func, context, argCount) {
        if (context === void 0) return func;
        switch (argCount == null ? 3 : argCount) {
            case 1:
                return function(value) {
                    return func.call(context, value);
                };
            case 2:
                return function(value, other) {
                    return func.call(context, value, other);
                };
            case 3:
                return function(value, index, collection) {
                    return func.call(context, value, index, collection);
                };
            case 4:
                return function(accumulator, value, index, collection) {
                    return func.call(context, accumulator, value, index, collection);
                };
        }
        return function() {
            return func.apply(context, arguments);
        };
    };

    _nop.compact = function(array) {
        return _nop.filter(array, _nop.identity);
    };

    _nop.filter = function(obj, predicate, context) {
        var results = [];
        if (obj == null) return results;
        predicate = _nop.iteratee(predicate, context);
        _nop.each(obj, function(value, index, list) {
            if (predicate(value, index, list)) results.push(value);
        });
        return results;
    };

    _nop.identity = function(value) {
        return value;
    };

    _nop.every = function(obj, predicate, context) {
        if (obj == null) return true;
        predicate = _nop.iteratee(predicate, context);
        var keys = obj.length !== +obj.length && _nop.keys(obj),
            length = (keys || obj).length,
            index, currentKey;
        for (index = 0; index < length; index++) {
            currentKey = keys ? keys[index] : index;
            if (!predicate(obj[currentKey], currentKey, obj)) return false;
        }
        return true;
    };

    _nop.union = function() {
        return _nop.uniq(flatten(arguments, true, true, []));
    };

    _nop.uniq = function(array, isSorted, iteratee, context) {
        if (array == null) return [];
        if (!_nop.isBoolean(isSorted)) {
            context = iteratee;
            iteratee = isSorted;
            isSorted = false;
        }
        if (iteratee != null) iteratee = _nop.iteratee(iteratee, context);
        var result = [];
        var seen = [];
        for (var i = 0, length = array.length; i < length; i++) {
            var value = array[i];
            if (isSorted) {
                if (!i || seen !== value) result.push(value);
                seen = value;
            } else if (iteratee) {
                var computed = iteratee(value, i, array);
                if (_nop.indexOf(seen, computed) < 0) {
                    seen.push(computed);
                    result.push(value);
                }
            } else if (_nop.indexOf(result, value) < 0) {
                result.push(value);
            }
        }
        return result;
    };

    _nop.pick = function(obj, iteratee, context) {
        var result = {},
            key;
        if (obj == null) return result;
        if (_nop.isFunction(iteratee)) {
            iteratee = createCallback(iteratee, context);
            for (key in obj) {
                var value = obj[key];
                if (iteratee(value, key, obj)) result[key] = value;
            }
        } else {
            var keys = concat.apply([], slice.call(arguments, 1));
            obj = new Object(obj);
            for (var i = 0, length = keys.length; i < length; i++) {
                key = keys[i];
                if (key in obj) result[key] = obj[key];
            }
        }
        return result;
    };

    _nop.has = function(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
    };

    _nop.keys = function(obj) {
        if (!_nop.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj)
            if (_nop.has(obj, key)) keys.push(key);
        return keys;
    };

    _nop.contains = function(obj, target) {
        if (obj == null) return false;
        if (obj.length !== +obj.length) obj = _nop.values(obj);
        return _nop.indexOf(obj, target) >= 0;
    };

    _nop.sortedIndex = function(array, obj, iteratee, context) {
        iteratee = _nop.iteratee(iteratee, context, 1);
        var value = iteratee(obj);
        var low = 0,
            high = array.length;
        while (low < high) {
            var mid = low + high >>> 1;
            if (iteratee(array[mid]) < value) low = mid + 1;
            else high = mid;
        }
        return low;
    };

    _nop.property = function(key) {
        return function(obj) {
            return obj[key];
        };
    };

    _nop.iteratee = function(value, context, argCount) {
        if (value == null) return _nop.identity;
        if (_nop.isFunction(value)) return createCallback(value, context, argCount);
        if (_nop.isObject(value)) return _nop.matches(value);
        return _nop.property(value);
    };

    _nop.pairs = function(obj) {
        var keys = _nop.keys(obj);
        var length = keys.length;
        var pairs = Array(length);
        for (var i = 0; i < length; i++) {
            pairs[i] = [keys[i], obj[keys[i]]];
        }
        return pairs;
    };

    _nop.matches = function(attrs) {
        var pairs = _nop.pairs(attrs),
            length = pairs.length;
        return function(obj) {
            if (obj == null) return !length;
            obj = new Object(obj);
            for (var i = 0; i < length; i++) {
                var pair = pairs[i],
                    key = pair[0];
                if (pair[1] !== obj[key] || !(key in obj)) return false;
            }
            return true;
        };
    };

    _nop.indexOf = function(array, item, isSorted) {
        if (array == null) return -1;
        var i = 0,
            length = array.length;
        if (isSorted) {
            if (typeof isSorted == 'number') {
                i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
            } else {
                i = _nop.sortedIndex(array, item);
                return array[i] === item ? i : -1;
            }
        }
        for (; i < length; i++)
            if (array[i] === item) return i;
        return -1;
    };

    _nop.values = function(obj) {
        var keys = _nop.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    };

    _nop.extend = function(obj) {
        if (!_nop.isObject(obj)) return obj;
        var source, prop;
        for (var i = 1, length = arguments.length; i < length; i++) {
            source = arguments[i];
            for (prop in source) {
                if (hasOwnProperty.call(source, prop)) {
                    obj[prop] = source[prop];
                }
            }
        }
        return obj;
    };

    _nop.isArray = function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    _nop.isBoolean = function(obj) {
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    };

    _nop.isUndefined = function(obj) {
        return obj === void 0;
    };

    _nop.isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    _nop.each = function(obj, iteratee, context) {
        if (obj == null) return obj;
        iteratee = createCallback(iteratee, context);
        var i, length = obj.length;
        if (length === +length) {
            for (i = 0; i < length; i++) {
                iteratee(obj[i], i, obj);
            }
        } else {
            var keys = _nop.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
                iteratee(obj[keys[i]], keys[i], obj);
            }
        }
        return obj;
    };

    _nop.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
        _nop['is' + name] = function(obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    });

    //
    //
    // **_json (strip of the required underscore.json methods)**
    // 
    // 
    var deepJSON = function(obj, key, value, remove) {

        var keys = key.replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').replace(/^\./, '').split('.'),
            root,
            i = 0,
            n = keys.length;

        if (arguments.length > 2) {

            root = obj;
            n--;

            while (i < n) {
                key = keys[i++];
                obj = obj[key] = _nop.isObject(obj[key]) ? obj[key] : {};
            }

            if (remove) {
                if (_nop.isArray(obj)) {
                    obj.splice(keys[i], 1);
                } else {
                    delete obj[keys[i]];
                }
            } else {
                obj[keys[i]] = value;
            }

            value = root;

        } else {
            while ((obj = obj[keys[i++]]) != null && i < n) {};
            value = i < n ? void 0 : obj;
        }

        return value;

    }

    var _json = {}

    _json.VERSION = '0.1.0';
    _json.debug = true;

    _json.exit = function(source, reason, data, value) {

        if (!_json.debug) return;

        var messages = {};
        messages.noJSON = "Not a JSON";
        messages.noString = "Not a String";
        messages.noArray = "Not an Array";
        messages.missing = "Missing argument";

        var error = {
            source: source,
            data: data,
            value: value
        };
        error.message = messages[reason] ? messages[reason] : "No particular reason";
        //console.log("Error", error);
        return;

    }

    _json.is = function(json) {

        return (toString.call(json) == "[object Object]");

    }

    _json.isStringified = function(string) {

        var test = false;
        try {
            test = /^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
        } catch (e) {}
        return test;

    }

    _json.get = function(json, selector) {

        if (json == undefined) return _json.exit("get", "missing", "json", json);
        if (selector == undefined) return _json.exit("get", "missing", "selector", selector);
        if (!_nop.isString(selector)) return _json.exit("get", "noString", "selector", selector);
        return deepJSON(json, selector);

    };

    _json.set = function(json, selector, value) {

        if (json == undefined) return _json.exit("set", "missing", "json", json);
        if (selector == undefined) return _json.exit("set", "missing", "selector", selector);
        if (!_nop.isString(selector)) return _json.exit("set", "noString", "selector", selector);
        return value ? deepJSON(json, selector, value) : _json.remove(json, selector);

    };

    _json.remove = function(json, selector) {

        if (json == undefined) return _json.exit("remove", "missing", "json", json);
        if (selector == undefined) return _json.exit("remove", "missing", "selector", selector);
        if (!_nop.isString(selector)) return _json.exit("remove", "noString", "selector", selector);
        return deepJSON(json, selector, null, true);

    }

    _json.push = function(json, selector, value, force) {

        if (json == undefined) return _json.exit("push", "missing", "json", json);
        if (selector == undefined) return _json.exit("push", "missing", "selector", selector);
        var array = _json.get(json, selector);
        if (!_nop.isArray(array)) {
            if (force) {
                array = [];
            } else {
                return _json.exit("push", "noArray", "array", array);
            }
        }
        array.push(value);
        return _json.set(json, selector, array);

    }

    _json.unshift = function(json, selector, value) {

        if (json == undefined) return _json.exit("unshift", "missing", "json", json);
        if (selector == undefined) return _json.exit("unshift", "missing", "selector", selector);
        if (value == undefined) return _json.exit("unshift", "missing", "value", value);
        var array = _json.get(json, selector);
        if (!_nop.isArray(array)) return _json.exit("unshift", "noArray", "array", array);
        array.unshift(value);
        return _json.set(json, selector, array);

    }

    _json.flatten = function(json) {

        if (json.constructor.name != "Object") return _json.exit("flatten", "noJSON", "json", json);

        var result = {};

        function recurse(cur, prop) {
            if (Object(cur) !== cur) {
                result[prop] = cur;
            } else if (Array.isArray(cur)) {
                for (var i = 0, l = cur.length; i < l; i++) {
                    recurse(cur[i], prop ? prop + "." + i : "" + i);
                    if (l == 0) result[prop] = [];
                }
            } else {
                var isEmpty = true;
                for (var p in cur) {
                    isEmpty = false;
                    recurse(cur[p], prop ? prop + "." + p : p);
                }
                if (isEmpty) result[prop] = {};
            }
        }
        recurse(json, "");
        return result;

    }

    _json.unflatten = function(data) {

        if (Object(data) !== data || Array.isArray(data))
            return data;
        var result = {},
            cur, prop, idx, last, temp;
        for (var p in data) {
            cur = result, prop = "", last = 0;
            do {
                idx = p.indexOf(".", last);
                temp = p.substring(last, idx !== -1 ? idx : undefined);
                cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
                prop = temp;
                last = idx + 1;
            } while (idx >= 0);
            cur[prop] = data[p];
        }
        return result[""];

    }

    _json.prettyprint = function(json) {

        return JSON.stringify(json, undefined, 2);

    }

    //
    //
    // **nQuery (mini replacement for jQuery)**
    //
    //

    var nQuery = function() {};
    nQuery.constructor = nQuery;

    nQuery.prototype.dom = function(selector, createOptions) {
        var self = this,
            elements = [];

        if (createOptions) {
            var element = document.createElement(selector);
            for (var k in createOptions) {
                element[k] = createOptions[k];
            }
        } else {
            if (_nop.isString(selector)) {
                elements = [].slice.call(document.querySelectorAll(selector));
            } else {
                if (_nop.isObject(selector) && selector.attributes) {
                    elements = [selector];
                }
            }
            self._elements = elements;
            self.length = elements.length;
            return self;
        }
    }

    nQuery.prototype.on = function(events, fn) {

        var self = this,
            elements = self._elements;
        events = events.split(" ");
        for (var i = 0, lenEl = elements.length; i < lenEl; i++) {
            var element = elements[i];
            for (var j = 0, lenEv = events.length; j < lenEv; j++) {
                if (element.addEventListener) {
                    element.addEventListener(events[j], fn, false);
                }
            }
        }

    }

    nQuery.prototype.find = function(selector) {

        var self = this,
            element = self.get(0),
            elements = [];

        if (_nop.isString(selector)) {
            elements = [].slice.call(element.querySelectorAll(selector));
        }
        self._elements = elements;
        return self;

    }

    nQuery.prototype.get = function(index, chain) {

        var self = this,
            elements = self._elements || [],
            element = elements[index] || {};

        if (chain) {
            self._element = element;
            return self;
        } else {
            return _nop.isNumber(index) ? element : elements;
        }

    }

    nQuery.prototype.reverse = function() {
        this._elements = this._elements.reverse();
        return this;
    }

    nQuery.prototype.val = function(value) {
        return this.prop("value", value);
    }

    nQuery.prototype.type = function(value) {
        return this.prop("type", value);
    }

    nQuery.prototype.html = function(value, options) {

        if (value != false) {
            return this.prop("innerHTML", value);
        }
    }

    nQuery.prototype.text = function(value, options) {



        if (value != false) {
            return this.prop("innerHTML", escapeHTML(value));
        }
    }

    nQuery.prototype.prop = function(prop, value) {

        var self = this,
            elements = self._elements;

        for (var i in elements) {
            if (_nop.isUndefined(value)) {
                return elements[i][prop];
            } else {
                elements[i][prop] = value;
            }
        }
    }

    nQuery.prototype.attr = function(attr, value) {
        var self = this,
            elements = self._elements;

        for (var i in elements) {
            if (value === undefined) {
                return elements[i].getAttribute(attr);
            } else {
                elements[i].setAttribute(attr, value);
            }
        }
        return self;
    }

    nQuery.prototype.removeAttr = function(attr) {
        var self = this;
        for (var i in self._elements) self._elements[i].removeAttribute(attr);
        return self;
    }

    nQuery.prototype.addClass = function(c) {
        var self = this;
        for (var i in self._elements) self._elements[i].classList.add(c);
        return self;
    }

    nQuery.prototype.removeClass = function(c) {
        var self = this;
        for (var i in self._elements) self._elements[i].classList.remove(c);
        return self;
    }

    nQuery.prototype.parents = function(selector) {
        var self = this,
            element = self.get(0),
            parent = element.parentNode,
            parents = [];

        while (parent !== null) {
            var o = parent,
                matches = matchesSelector(o, selector),
                isNotDomRoot = (o.doctype === undefined) ? true : false;
            if (!selector) {
                matches = true;
            }
            if (matches && isNotDomRoot) {
                parents.push(o);
            }
            parent = o.parentNode;
        }
        self._elements = parents;
        return self;
    }

    nQuery.prototype.parent = function(selector) {
        var self = this,
            element = self.get(0),
            o = element.parentNode,
            matches = matchesSelector(o, selector);
        if (!selector) {
            matches = true;
        }
        return matches ? o : {};
    }

    nQuery.prototype.clone = function(chain) {
        var self = this,
            element = self.get(0),
            clone = element.cloneNode(true);
        self._elements = [clone];
        return chain ? self : clone;
    }

    nQuery.prototype.empty = function(chain) {
        var self = this,
            element = self.get(0);
        if (!element || !element.hasChildNodes) {
            return chain ? self : element;
        }

        while (element.hasChildNodes()) {
            element.removeChild(element.lastChild);
        }
        return chain ? self : element;
    }

    nQuery.prototype.replaceWith = function(newDOM) {
        var self = this,
            oldDOM = self.get(0),
            parent = oldDOM.parentNode;
        parent.replaceChild(newDOM, oldDOM);
    }

    nQuery.prototype.ready = function(callback) {

        if (document && _nop.isFunction(document.addEventListener)) {
            document.addEventListener("DOMContentLoaded", callback, false);
        } else if (window && _nop.isFunction(window.addEventListener)) {
            window.addEventListener("load", callback, false);
        } else {
            document.onreadystatechange = function() {
                if (document.readyState === "complete") {
                    callback();
                }
            }
        }

    }

    //
    //
    // **WATCH DOM EVENTS**
    //
    //
    nop = new NOP();

    var timeoutInput = null;
    var eventInputChange = function(e) {
        if (timeoutInput) {
            clearTimeout(timeoutInput);
        }
        timeoutInput = setTimeout(function() {
            var element = n.dom(e.target).get(0);
            nop.dom(element).toStorage();
        }, nop.options.timeout);
    }

    var eventClear = function(e) {
        e.preventDefault();
        var options = nop.dom(this).getOptions();
        nop.remove(options.data, options);
    }

    var eventPush = function(e) {
        e.preventDefault();
        var options = nop.dom(this).getOptions();
        if (!options || !options["action-push"]) {
            return false;
        }
        var split = options["action-push"].split(":"),
            selector = split[0] || null,
            value = split[1] || null;
        nop.push(selector, value, options);
    }

    var eventRemove = function(e) {
        e.preventDefault();
        var options = nop.dom(this).getOptions();
        if (!options || !options["action-remove"]) {
            return false;
        }
        nop.remove(options["action-remove"], options);

        console.log("Remove");
    }

    var timeoutDOM = null;
    var eventDOMChange = function() {
        if (timeoutDOM) {
            clearTimeout(timeoutDOM);
        }
        timeoutDOM = setTimeout(function() {
            nop.registerDependencies();
            setEventListeners();
        }, nop.options.timeoutDOM);
    }

    //
    //
    // **INITIATE**
    // 
    // 
    n = new nQuery();
    nop.n = n;

    var setEventListeners = function() {

        n.dom("body").on("DOMSubtreeModified", eventDOMChange);
        n.dom("[" + tagPrefix + "-data]").on("input change", eventInputChange);
        n.dom("[" + tagPrefix + "-bind]").on("input change", eventInputChange);

        n.dom("[" + tagPrefix + "-clear]").on("click", eventClear);
        n.dom("[" + tagPrefix + "-action-remove]").on("click", eventRemove);
        n.dom("[" + tagPrefix + "-action-push]").on("click", eventPush);

    }

    var eventInit = function() {
        setEventListeners();
        nop.restore();
        nop.setDefaults();
        nop.registerDependencies();
        nop.updateDependencies();
    }

    n.ready(eventInit);

    return nop;

}));
