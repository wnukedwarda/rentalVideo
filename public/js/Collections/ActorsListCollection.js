(function() {

APP.Collections.ActorsList = Backbone.Collection.extend({

    model: APP.Models.Actor,

    url: "/actors"

});

})();