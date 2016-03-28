var alltiny = alltiny || {};
alltiny.SelectBox = function(targetSelector, options) {
	var thisObj = this;
	this.$target = jQuery(targetSelector).addClass('selectbox');
	this.options = jQuery.extend(true, {
		items        : [], // array of items;
		itemValuer   : function(item) { return item.value; }, // this function returns the value of an item. Override it if item value must be retrieved differently.
		itemRenderer : function($element, item) {},
		selectedValue: null
	}, options);
	// render a hidder input field to carry the currently selected value.
	this.$input = jQuery('<input type="text" style="display:none">').appendTo(this.$target);
	// render a visible representator of the currently selected value.
	this.$representer = jQuery('<div class="representer">').appendTo(this.$target);
	// render a flyout with all available items.
	this.$flyout = jQuery('<div class="flyout">').hide().appendTo(this.$target);
	// create and fill a item list in the flyout.
	this.$list = jQuery('<ul>').appendTo(this.$flyout);
	for (var i = 0; i < this.options.items.length; i++) {
		var item = this.options.items[i];
		var $item = jQuery('<li>').attr('data-value', this.options.itemValuer(item)).appendTo(this.$list);
		this.options.itemRenderer($item, item);
		// append a click listener to the item.
		$item.click(function() {
			thisObj.$flyout.finish().slideUp({duration: 200});
			thisObj.setSelectedValue(jQuery(this).attr('data-value'));
		});
	}
	// append a change listener onto the input field.
	this.$input.change(function(event) {
		thisObj.selectedItem = thisObj.findItemByValue(thisObj.$input.val());
		thisObj.options.itemRenderer(thisObj.$representer.empty(), thisObj.selectedItem);
		// mark the currently selected option in the flyout list.
		thisObj.$flyout.find('li.selected').removeClass('selected');
		thisObj.$flyout.find('li[data-value="' + thisObj.options.itemValuer(thisObj.selectedItem) + '"]').addClass('selected');
	});
	this.$representer.click(function() {
		thisObj.$flyout.finish().slideToggle({duration: 200});
	});
	this.$target.mouseenter(function() {
		thisObj.$flyout.finish().slideDown({duration: 100});
	});
	this.$target.mouseleave(function() {
		thisObj.$flyout.finish().slideUp({duration: 200});
	});
};

alltiny.SelectBox.prototype.change = function(handler) {
	this.$input.change(handler);
};

alltiny.SelectBox.prototype.findItemByValue = function(value) {
	// try to find the wanted item.
	for (var i = 0; i < this.options.items.length; i++) {
		var item = this.options.items[i];
		if (this.options.itemValuer(item) === value) {
			return item;
		}
	}
	return null;
};

alltiny.SelectBox.prototype.setSelectedValue = function(newValue) {
	var oldValue = this.$input.val();
	this.$input.val(newValue);
	// only fire a change event if value has changed.
	if (oldValue !== this.$input.val()) {
		this.$input.change();
	}
};

alltiny.SelectBox.prototype.getSelectedValue = function() {
	return this.$input.val();
};

alltiny.SelectBox.prototype.getSelectedItem = function(item) {
	return this.selectedItem;
};