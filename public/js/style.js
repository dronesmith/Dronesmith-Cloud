(function($){

// side menu bar to center menu bar setting
	var toggleMenu = $('a#toggleMenu');

	toggleMenu.click(function(event){
		var menuBG = $('div#menuBackground');
		var nav = $('nav#menu');
		var nav_item = $('nav#menu ul')

		event.preventDefault();

		$(this).toggleClass('active');

		if($('#menu').is(':visible')){
			$('#menu').fadeOut(0);
			$('div#view').switchClass('view-width', 'col-xs-12');
			menuBG.removeClass('greyBar');
		}
		else{	
			if($(window).width() < 768){
				$('#menu').fadeIn(800);
				if(menuBG.hasClass('greyBar')){
					menuBG.removeClass('greyBar');
				}

				if(nav_item.hasClass('nav-stacked')){
					nav_item.switchClass('nav-stacked', 'nav-justified', 0);
					nav.css('width', 'auto')
				}
			}
			else if($(window).width() >= 768){
				if(nav_item.hasClass('nav-justified')){
					nav_item.switchClass('nav-justified', 'nav-stacked', 0);
					nav.css('width', '80px');
					$('div#view').switchClass('col-xs-12', 'view-width', 0);
					$('#menu').fadeIn(800);
				}
				else{	
					$('div#view').switchClass('col-xs-12', 'view-width', 0);
					$('#menu').fadeIn(800);
					menuBG.addClass('greyBar');
				}
			}	
		}
	}); 
	
	// adjust menu bar while resizing windows
	$(window).resize(function(){
		var menuBG = $('div#menuBackground');
		var nav = $('nav#menu');
		var nav_item = $('nav#menu ul')

		if(nav_item.hasClass('nav-stacked') &&$ ('#menu').is(':visible')){
			menuBG.addClass('greyBar');
		}

		if($(window).width() < 768){
			if(menuBG.hasClass('greyBar')){
				menuBG.removeClass('greyBar');
			}

			if(nav_item.hasClass('nav-stacked')){
				nav_item.switchClass('nav-stacked', 'nav-justified', 0);
				nav.css('width', 'auto');
			}
		}
		else if($(window).width() >= 768){
			if(nav_item.hasClass('nav-justified')){
				nav_item.switchClass('nav-justified', 'nav-stacked', 0);
				nav.css('width', '80px');
			}
		}

	});
// menu bar setting end


})(jQuery);