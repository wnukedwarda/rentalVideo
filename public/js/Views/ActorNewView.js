(function() {

APP.Views.ActorNew = Backbone.View.extend({

    tagName: "div",

    template: JST["actorEditNewTemplate"],

    initialize: function() {

        this.listenToOnce(this.model, "sync", _.bind(APP.Router.redirectToEdit, this));
        this.listenToOnce(this.model, "sync", APP.Messages.showAddedInfo);
        this.listenTo(this.model, "invalid", _.bind(APP.Messages.showErrorInfo, this));

        this.delegateEvents({
            "submit form": _.bind(APP.CRUD.createItem, this)
        });

        this.render();

    },

    render: function() {

        var html = this.template( this.model.toJSON() );

        this.$el.html(html);

        APP.Regions.appContent.html(this.el);

        this.stickit();

    },

    bindings: {
        "#actor-name": "name"
    }

});

})();