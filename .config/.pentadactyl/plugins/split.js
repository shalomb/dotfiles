command -js gbm (
    function(){
      var a=window,b=buffer.doc,c=encodeURIComponent,d=a.openWebPanel("Google Bookmark", "https://www.google.com/bookmarks/mark?op=edit&output=popup&bkmk="+c(b.location)+"&title="+c(b.title));
   })();
