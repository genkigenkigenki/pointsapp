var classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/;

$$ = function(element, selector){
    var found;
    return (element === document && idSelectorRE.test(selector)) ?
        ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
        Array.prototype.slice.call(
            classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
                tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
                    element.querySelectorAll(selector)
        );
}