function ComponentManager (node) {
    this.node = node;
    this.components = [];
    node.addComponent(this);
}

ComponentManager.prototype.onDismount = function onDismount () {
    for (var i = 0; i < this.components.length; ++i) {
        this.node.removeComponent(this.components[i]);
    }
};

ComponentManager.prototype.onShow = function onMount () {
    for (var i = 0; i < this.components.length; ++i) {
        this.node.addComponent(this.components[i]);
    }
};

ComponentManager.prototype.addComponent = function addComponent (component) {
    this.components.push(component);
};

module.exports = ComponentManager;